/*
 * Copyright © 2020 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { EventHandler } from "@atomist/skill/lib/handler";
import { info } from "@atomist/skill/lib/log";
import { MessageOptions } from "@atomist/skill/lib/message";
import {
    ContainerStatus,
    parsePodStatus,
    PodStatus,
} from "./podStatus";
import {
    ChatChannelQuery,
    K8Pod,
    K8sPodStateSubscription,
} from "./types";

/** Create string for Kubernetes pod. */
function podSlug(pod: K8Pod): string {
    return `pod ${pod.namespace}/${pod.name} in Kubernetes cluster ${pod.environment}`;
}

/** Create string for Kubernetes container. */
function containerSlug(pod: K8Pod, container: ContainerStatus, init = false): string {
    return `${(init) ? "init " : ""}container ${container.name} (${container.image}) of ${podSlug(pod)}`;
}

/** Return unique pod identifier string. */
function podId(pod: K8Pod): string {
    return [pod.environment, pod.namespace, pod.name].join(":");
}

/** Return unique container identifier string. */
function containerId(pod: K8Pod, container: ContainerStatus, init = false): string {
    const parts = [podId(pod)];
    if (init) {
        parts.push("init");
    }
    parts.push(container.name);
    return parts.join(":");
}

/** Uppercase first letter of string. */
function ucFirst(s: string | undefined): string | undefined {
    if (!s) {
        return s;
    }
    return s.substring(0, 1).toUpperCase() + s.substring(1);
}

/** K8sPodState skill parameters. */
export interface K8sPodStateConfiguration {
    /** Chat channels to sent alerts to. */
    channels: string[];
    /** Whether to alert for containers in CrashLoopBackoff. */
    crashLoopBackOff: boolean;
    /** Whether to alert for containers in ImagePullBackoff. */
    imagePullBackOff: boolean;
    /** Alert when init container fails more times than this, set to `0` to disable. */
    initContainerFailureCount: number;
    /** How often to alert a given condition, in minutes. */
    intervalMinutes: number;
    /** Alert if pod container restarts exceeds this value, set to `0` to disable. */
    maxRestarts: number;
    /** Alert when containers are not ready after this number of seconds, set to `0` to disable. */
    notReadyDelaySeconds: number;
    /** Alert when pod has not been scheduled after this number of seconds, set to `0` to disable. */
    notScheduledDelaySeconds: number;
    /** Rate of container restarts to alert on, set to `0` to disable. */
    restartsPerDay: number;
    /**
     * Regular expression matching Kubernetes clusters whose pods
     * should be reported on.  If not provided, all clusters not
     * matching [[clusterExcludeRegExp]] are reported on.  The cluster
     * for a pod is obtained from the k8vent environment property.
     */
    clusterIncludeRegExp?: string;
    /** Regular expression matching Kubernetes clusters whose pods should _not_ be reported on. */
    clusterExcludeRegExp?: string;
    /**
     * Regular expression matching namespaces whose pods should be
     * reported on.  If not provided, all namespaces not matching
     * [[namespaceExcludeRegExp]] are reported on.
     */
    namespaceIncludeRegExp?: string;
    /** Regular expression matching namespaces whose pods should _not_ be reported on. */
    namespaceExcludeRegExp?: string;
}

/** Structure for reporting on pods and containers. */
interface PodContainer {
    /** Pod or container unique identifier. */
    id: string;
    /** Pod or container descriptive string. */
    slug: string;
    /** Description of detected error, if any. */
    error?: string;
}

/** Arguments to pod-inspecting functions. */
interface PodArgs {
    /** Current time in milliseconds since the epoch. */
    now: number;
    /** Configuration parameters. */
    parameters: K8sPodStateConfiguration;
    /** Pod object. */
    pod: K8Pod;
    /** Parsed pod statusJSON property. */
    status: PodStatus;
}

/** Detect if pod has been unscheduled too long. */
function podUnscheduled(pa: PodArgs): PodContainer {
    const p: PodContainer = {
        id: podId(pa.pod),
        slug: podSlug(pa.pod),
    };
    if (pa.parameters.notScheduledDelaySeconds < 1) {
        return p;
    }
    if (!pa.pod.timestamp) {
        return p;
    }
    const unscheduled = pa.status.conditions.find(c => c.type === "PodScheduled" && c.reason === "Unschedulable");
    if (!unscheduled) {
        return p;
    }
    const podCreationTime = new Date(pa.pod.timestamp).getTime();
    const podAgeSeconds = (pa.now - podCreationTime) / 1000;
    if (podAgeSeconds > pa.parameters.notScheduledDelaySeconds) {
        p.error = ucFirst(`${podSlug(pa.pod)} has not been scheduled: \`${unscheduled.message}\``);
    }
    return p;
}

/** Arguments to container-inspecting functions. */
interface ContainerArgs extends PodArgs {
    /** Container status obtained from parsed pod statusJSON property. */
    container: ContainerStatus;
}

/** Detect if init container failed too many times. */
function initContainerFail(ca: ContainerArgs): PodContainer {
    const pic: PodContainer = {
        id: containerId(ca.pod, ca.container, true),
        slug: containerSlug(ca.pod, ca.container, true),
    };
    if (ca.parameters.initContainerFailureCount < 1) {
        return pic;
    }
    if (ca.container.state?.terminated?.reason === "Error" && ca.container.restartCount > ca.parameters.initContainerFailureCount) {
        pic.error = `Init ${containerSlug(ca.pod, ca.container)} failed: \`${ca.container.state.terminated.exitCode}\``;
    }
    return pic;
}

/** Detect if container is in ImagePullBackOff. */
function containerImagePullBackOff(ca: ContainerArgs): string | undefined {
    if (!ca.parameters.imagePullBackOff) {
        return undefined;
    }
    if (!ca.container.state?.waiting) {
        return undefined;
    }
    if (ca.container.state.waiting.reason === "ImagePullBackOff") {
        return `${containerSlug(ca.pod, ca.container)} is in ImagePullBackOff: \`${ca.container.state.waiting.message}\``;
    }
    return undefined;
}

/** Detect if container is in CrashLoopBackOff. */
function containerCrashLoopBackOff(ca: ContainerArgs): string | undefined {
    if (!ca.parameters.crashLoopBackOff) {
        return undefined;
    }
    if (!ca.container.state?.waiting) {
        return undefined;
    }
    if (ca.container.state.waiting.reason === "CrashLoopBackOff") {
        return `${containerSlug(ca.pod, ca.container)} is in CrashLoopBackOff: \`${ca.container.state.waiting.message}\``;
    }
    return undefined;
}

/** Detect if container is in not ready. */
function containerNotReady(ca: ContainerArgs): string | undefined {
    if (ca.parameters.notReadyDelaySeconds < 1) {
        return undefined;
    }
    if (ca.container.state?.waiting) {
        return undefined;
    }
    if (!ca.container.state?.running) {
        return undefined;
    }
    if (!ca.status.startTime) {
        return undefined;
    }
    if (ca.container.ready !== false) {
        return undefined;
    }
    const podDurationSeconds = (ca.now - new Date(ca.status.startTime).getTime()) / 1000;
    if (podDurationSeconds > ca.parameters.notReadyDelaySeconds) {
        return `${containerSlug(ca.pod, ca.container)} is not ready`;
    }
    return undefined;
}

/** Detect if container has restarted too many times. */
function containerMaxRestart(ca: ContainerArgs): string | undefined {
    if (ca.parameters.maxRestarts < 1) {
        return undefined;
    }
    if (!ca.container.restartCount) {
        return undefined;
    }
    if (ca.container.restartCount > ca.parameters.maxRestarts) {
        return `${containerSlug(ca.pod, ca.container)} has restarted too many times: ` +
            `\`${ca.container.restartCount} > ${ca.parameters.maxRestarts}\``;
    }
    return undefined;
}

/** Detect if container has exceeded allowable restart rate. */
function containerRestartRate(ca: ContainerArgs): string | undefined {
    if (ca.parameters.restartsPerDay < 0.01) {
        return undefined;
    }
    if (!ca.status.startTime) {
        return undefined;
    }
    if (!ca.container.restartCount) {
        return undefined;
    }
    const podDurationDays = (ca.now - new Date(ca.status.startTime).getTime()) / 1000 / 60 / 60 / 24;
    const minAge = 0.1;
    if (podDurationDays < minAge) {
        return undefined;
    }
    if ((ca.container.restartCount / podDurationDays) > ca.parameters.restartsPerDay) {
        return `${containerSlug(ca.pod, ca.container)} restarts have exceeded acceptable rate: ` +
            `${ca.container.restartCount} restarts over ${podDurationDays.toFixed(1)} days`;
    }
    return undefined;
}

/** Process K8Pod event and send alerts. */
export const handler: EventHandler<K8sPodStateSubscription, K8sPodStateConfiguration> = async ctx => {
    for (const pod of ctx.data.K8Pod) {
        info(`${ucFirst(podSlug(pod))} status: ${pod.statusJSON}`);
    }
    const now = new Date().getTime();
    const reasons: string[] = [];
    for (const configuration of ctx.configuration) {
        const parameters = configuration.parameters;
        const parameterChannels = parameters.channels;
        const chatChannelResponse = await ctx.graphql.query<ChatChannelQuery>("chatChannel.graphql", { channels: parameterChannels });
        const channels = chatChannelResponse.ChatChannel.filter(c => !c.archived).map(c => c.name);
        const users: string[] = [];
        const destination = { channels, users };

        for (const pod of ctx.data.K8Pod) {
            if (parameters.clusterExcludeRegExp && RegExp(parameters.clusterExcludeRegExp).test(pod.environment)) {
                continue;
            }
            if (parameters.clusterIncludeRegExp && !RegExp(parameters.clusterIncludeRegExp).test(pod.environment)) {
                continue;
            }
            if (parameters.namespaceExcludeRegExp && RegExp(parameters.namespaceExcludeRegExp).test(pod.namespace)) {
                continue;
            }
            if (parameters.namespaceIncludeRegExp && !RegExp(parameters.namespaceIncludeRegExp).test(pod.namespace)) {
                continue;
            }

            let status: PodStatus;
            try {
                status = parsePodStatus(pod);
            } catch (e) {
                const msg = `Failed to parse status of ${podSlug(pod)}: ${e.message}`;
                await ctx.audit.log(msg);
                continue;
            }

            const podContainers: PodContainer[] = [];

            podContainers.push(podUnscheduled({ now, parameters, pod, status }));

            if (podContainers.filter(c => !!c.error).length < 1 && status.initContainerStatuses) {
                for (const container of status.initContainerStatuses) {
                    podContainers.push(initContainerFail({ now, parameters, pod, status, container }));
                }
            }

            if (podContainers.filter(c => !!c.error).length < 1 && status.containerStatuses) {
                for (const container of status.containerStatuses) {
                    const pc: PodContainer = {
                        id: containerId(pod, container),
                        slug: containerSlug(pod, container),
                    };

                    const checks = [
                        containerImagePullBackOff,
                        containerCrashLoopBackOff,
                        containerNotReady,
                        containerMaxRestart,
                        containerRestartRate,
                    ];
                    for (const check of checks) {
                        const error = check({ now, parameters, pod, status, container });
                        if (error) {
                            pc.error = ucFirst(error);
                            break;
                        }
                    }

                    podContainers.push(pc);
                }
            }

            for (const container of podContainers) {
                const options: MessageOptions = {
                    id: container.id,
                    ttl: parameters.intervalMinutes * 60 * 1000,
                };
                let message: string;
                if (!container.error) {
                    options.post = "update_only";
                    message = `${ucFirst(container.slug)} recovered`;
                } else {
                    message = container.error;
                }
                try {
                    await ctx.message.send(message, destination, options);
                    if (container.error) {
                        await ctx.audit.log(container.error);
                    }
                } catch (e) {
                    await ctx.audit.log(`Failed to send message ${options.id}: ${e.message}`);
                }
            }

            reasons.push(...podContainers.map(c => c.error).filter(m => !!m));
        }
    }

    if (reasons.length > 0) {
        return {
            code: reasons.length,
            reason: reasons.join("; "),
        };
    } else {
        return {
            code: 0,
            reason: "All pods healthy",
            visibility: "hidden",
        };
    }
};
