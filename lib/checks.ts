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

import { K8sPodCheckParameters } from "./parameter";
import { ContainerStatus, PodStatus } from "./pod";
import { K8Pod } from "./typings/types";
import { ucFirst } from "./util";

/** Create string for Kubernetes pod. */
export function podSlug(pod: K8Pod): string {
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
export interface PodArgs {
    /** Current time in milliseconds since the epoch. */
    now: number;
    /** Configuration parameters. */
    parameters: K8sPodCheckParameters;
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
    if (ca.container.state?.terminated?.reason === "Error" && ca.container.restartCount >= ca.parameters.initContainerFailureCount) {
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

/** Detect if container has been OOMKilled. */
function containerOomKilled(ca: ContainerArgs): string | undefined {
    if (!ca.parameters.oomKilled) {
        return undefined;
    }
    if (!ca.container.state?.terminated) {
        return undefined;
    }
    if (ca.container.state.terminated.reason === "OOMKilled") {
        return `${containerSlug(ca.pod, ca.container)} has been OOMKilled: \`${ca.container.state.terminated.exitCode}\``;
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
    if (!ca.status.startTime) {
        return undefined;
    }
    if (ca.container.ready !== false) {
        return undefined;
    }
    const podDurationSeconds = (ca.now - new Date(ca.status.startTime).getTime()) / 1000;
    if (ca.container.state?.terminated) {
        return "DELETE";
    } else if (ca.container.state?.running) {
        if (podDurationSeconds > ca.parameters.notReadyDelaySeconds) {
            return `${containerSlug(ca.pod, ca.container)} is not ready`;
        }
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
    if (ca.container.restartCount >= ca.parameters.maxRestarts) {
        return `${containerSlug(ca.pod, ca.container)} has restarted too many times: ` +
            `\`${ca.container.restartCount} > ${ca.parameters.maxRestarts}\``;
    }
    return undefined;
}

/** Interrogate pod status and return array of states. */
export async function checkPodState(pa: PodArgs): Promise<PodContainer[]> {
    const podContainers: PodContainer[] = [];

    if (pa.parameters.clusterExcludeRegExp && RegExp(pa.parameters.clusterExcludeRegExp).test(pa.pod.environment)) {
        return podContainers;
    }
    if (pa.parameters.clusterIncludeRegExp && !RegExp(pa.parameters.clusterIncludeRegExp).test(pa.pod.environment)) {
        return podContainers;
    }
    if (pa.parameters.namespaceExcludeRegExp && RegExp(pa.parameters.namespaceExcludeRegExp).test(pa.pod.namespace)) {
        return podContainers;
    }
    if (pa.parameters.namespaceIncludeRegExp && !RegExp(pa.parameters.namespaceIncludeRegExp).test(pa.pod.namespace)) {
        return podContainers;
    }

    podContainers.push(podUnscheduled(pa));

    if (podContainers.filter(c => !!c.error).length < 1 && pa.status.initContainerStatuses) {
        for (const container of pa.status.initContainerStatuses) {
            podContainers.push(initContainerFail({ ...pa, container }));
        }
    }

    if (podContainers.filter(c => !!c.error).length < 1 && pa.status.containerStatuses) {
        for (const container of pa.status.containerStatuses) {
            const pc: PodContainer = {
                id: containerId(pa.pod, container),
                slug: containerSlug(pa.pod, container),
            };

            const checks = [
                containerImagePullBackOff,
                containerCrashLoopBackOff,
                containerOomKilled,
                containerMaxRestart,
                containerNotReady,
            ];
            for (const check of checks) {
                const error = check({ ...pa, container });
                if (error) {
                    pc.error = ucFirst(error);
                    break;
                }
            }

            podContainers.push(pc);
        }
    }

    return podContainers;
}
