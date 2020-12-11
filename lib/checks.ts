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

import { GraphQLClient } from "@atomist/skill";

import { K8sPodCheckParameters } from "./parameter";
import { ContainerStatus, PodStatus } from "./pod";
import { K8Pod, KubernetesClusterProviderQuery } from "./typings/types";
import { ucFirst } from "./util";

/** Arguments to [[checkCluster]]. */
export interface CheckClusterArgs {
	/** Cluster name of the pod in the event data.  */
	clusterName: string;
	/** Client to query for Kubernetes cluster providers. */
	graphql: GraphQLClient;
	/** Resource providers from skill configuration. */
	resourceProviders: Record<
		string,
		{
			typeName: string;
			selectedResourceProviders: Array<{ id: string }>;
		}
	>;
}

/**
 * Iterate through selected resource providers to see if any match the provided cluster name.
 *
 * @param args see [[CheckClusterArgs]].
 */
export async function checkCluster(args: CheckClusterArgs): Promise<boolean> {
	const env = args.clusterName;
	const providers = args.resourceProviders;
	const clusterProviderIds = Object.keys(providers)
		.filter(
			provider =>
				providers[provider].typeName === "KubernetesClusterProvider",
		)
		.map(
			clustersProvider =>
				providers[clustersProvider].selectedResourceProviders,
		)
		.map(clusters => clusters.map(c => c.id))
		.reduce((acc, cur) => acc.concat(...cur), [])
		.filter((value, index, self) => self.indexOf(value) === index);
	const clusters: string[] = [];
	for (const clusterProviderId of clusterProviderIds) {
		const kubernetesClusterProviderResponse = await args.graphql.query<KubernetesClusterProviderQuery>(
			"kubernetesClusterProvider.graphql",
			{ id: clusterProviderId },
		);
		clusters.push(
			...kubernetesClusterProviderResponse.KubernetesClusterProvider.map(
				kcp => kcp.name,
			),
		);
	}
	return clusters.includes(env);
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

/** Arguments to container-inspecting functions. */
interface ContainerArgs extends PodArgs {
	/** Container status obtained from parsed pod statusJSON property. */
	container: ContainerStatus;
	/** Set to true if container is an init container. */
	init?: boolean;
}

/** Create string for Kubernetes pod. */
export function podSlug(pod: K8Pod): string {
	return `pod ${pod.namespace}/${pod.name} in Kubernetes cluster ${pod.clusterName}`;
}

/** Create string for Kubernetes container. */
function containerSlug(
	ca: Pick<ContainerArgs, "container" | "init" | "pod">,
): string {
	return `${ca.init ? "init " : ""}container ${ca.container.name} (${
		ca.container.image
	}) of ${podSlug(ca.pod)}`;
}

/** Return unique pod identifier string. */
function podId(pod: K8Pod): string {
	return [pod.clusterName, pod.namespace, pod.name].join(":");
}

/** Return unique container identifier string. */
function containerId(
	ca: Pick<ContainerArgs, "container" | "init" | "pod">,
): string {
	const parts = [podId(ca.pod)];
	if (ca.init) {
		parts.push("init");
	}
	parts.push(ca.container.name);
	return parts.join(":");
}

/** Detect if pod was deleted. */
export function podDeleted(
	pa: Pick<PodArgs, "pod" | "status">,
): PodContainer[] {
	if (pa.status.phase !== "Deleted") {
		return [];
	}
	const p: PodContainer = {
		id: podId(pa.pod),
		slug: podSlug(pa.pod),
		error: ucFirst(`${podSlug(pa.pod)} was deleted`),
	};
	const podContainers: PodContainer[] = [p];
	for (const container of pa.status.containerStatuses) {
		const slug = containerSlug({ ...pa, container });
		const pc: PodContainer = {
			id: containerId({ ...pa, container }),
			slug,
			error: ucFirst(`${slug} was deleted`),
		};
		podContainers.push(pc);
	}
	return podContainers;
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
	const unscheduled = pa.status.conditions.find(
		c => c.type === "PodScheduled" && c.reason === "Unschedulable",
	);
	if (!unscheduled) {
		return p;
	}
	const podCreationTime = new Date(pa.pod.timestamp).getTime();
	const podAgeSeconds = (pa.now - podCreationTime) / 1000;
	if (podAgeSeconds > pa.parameters.notScheduledDelaySeconds) {
		p.error = ucFirst(
			`${podSlug(pa.pod)} has not been scheduled: \`${
				unscheduled.message
			}\``,
		);
	}
	return p;
}

/** Detect if container has been creating too long. */
function containerCreating(ca: ContainerArgs): string | undefined {
	if (ca.parameters.notCreatedSeconds < 1) {
		return undefined;
	}
	if (!ca.pod.timestamp) {
		return undefined;
	}
	if (ca.container.state?.waiting?.reason !== "ContainerCreating") {
		return undefined;
	}
	const podCreationTime = new Date(ca.pod.timestamp).getTime();
	const podAgeSeconds = (ca.now - podCreationTime) / 1000;
	if (podAgeSeconds > ca.parameters.notCreatedSeconds) {
		return `${containerSlug(ca)} has been creating too long`;
	}
	return undefined;
}

/** Detect if container is in CreateContainerConfigError. */
function containerConfigError(ca: ContainerArgs): string | undefined {
	if (!ca.parameters.createContainerConfigError) {
		return undefined;
	}
	if (!ca.container.state?.waiting) {
		return undefined;
	}
	if (ca.container.state.waiting.reason === "CreateContainerConfigError") {
		return `${containerSlug(ca)} is in CreateContainerConfigError: \`${
			ca.container.state.waiting.message
		}\``;
	}
	return undefined;
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
		return `${containerSlug(ca)} is in ImagePullBackOff: \`${
			ca.container.state.waiting.message
		}\``;
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
		return `${containerSlug(ca)} is in CrashLoopBackOff: \`${
			ca.container.state.waiting.message
		}\``;
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
		return `${containerSlug(ca)} has been OOMKilled: \`${
			ca.container.state.terminated.exitCode
		}\``;
	}
	return undefined;
}

/** Detect if container is in not ready. */
function containerNotReady(ca: ContainerArgs): string | undefined {
	if (ca.init) {
		return undefined;
	}
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
	const podDurationSeconds =
		(ca.now - new Date(ca.status.startTime).getTime()) / 1000;
	if (ca.container.state?.terminated) {
		return undefined;
	} else if (ca.container.state?.running) {
		if (podDurationSeconds > ca.parameters.notReadyDelaySeconds) {
			return `${containerSlug(ca)} is not ready`;
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
		return (
			`${containerSlug(ca)} has restarted too many times: ` +
			`\`${ca.container.restartCount} > ${ca.parameters.maxRestarts}\``
		);
	}
	return undefined;
}

interface CheckContainerArgs extends ContainerArgs {
	checks: Array<(ca: ContainerArgs) => string | undefined>;
}

/**
 * Run container status through a series of checks.
 */
function checkContainerState(cc: CheckContainerArgs): PodContainer {
	const pc: PodContainer = {
		id: containerId(cc),
		slug: containerSlug(cc),
	};
	for (const check of cc.checks) {
		const error = check(cc);
		if (error) {
			pc.error = ucFirst(error);
			break;
		}
	}
	return pc;
}

/** Return true if any of the pod containers have an error. */
function foundError(pcs: PodContainer[]): boolean {
	return !pcs.every(c => !c.error);
}

/** Interrogate pod status and return array of states. */
export function checkPodState(pa: PodArgs): PodContainer[] {
	const podContainers: PodContainer[] = [];

	if (
		pa.parameters.namespaceExcludeRegExp &&
		RegExp(pa.parameters.namespaceExcludeRegExp).test(pa.pod.namespace)
	) {
		return podContainers;
	}
	if (
		pa.parameters.namespaceIncludeRegExp &&
		!RegExp(pa.parameters.namespaceIncludeRegExp).test(pa.pod.namespace)
	) {
		return podContainers;
	}

	const deleted = podDeleted(pa);
	if (deleted.length > 0) {
		return deleted;
	}
	podContainers.push(podUnscheduled(pa));
	if (foundError(podContainers)) {
		return podContainers;
	}

	const checks = [
		containerCreating,
		containerConfigError,
		containerImagePullBackOff,
		containerCrashLoopBackOff,
		containerOomKilled,
		containerMaxRestart,
		containerNotReady,
	];

	if (pa.status.initContainerStatuses) {
		for (const container of pa.status.initContainerStatuses) {
			podContainers.push(
				checkContainerState({ ...pa, container, checks, init: true }),
			);
		}
	}
	if (foundError(podContainers)) {
		return podContainers;
	}

	if (pa.status.containerStatuses) {
		for (const container of pa.status.containerStatuses) {
			podContainers.push(
				checkContainerState({ ...pa, container, checks }),
			);
		}
	}

	return podContainers;
}
