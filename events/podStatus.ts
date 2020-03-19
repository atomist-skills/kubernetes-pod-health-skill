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

import { K8sPodStateSubscription } from "./types";

/** Extracted from @kubernetes/client-node. */
export interface ContainerStateRunning {
    /**
     * Time at which previous execution of the container started
     */
    startedAt?: Date;
}

/** Extracted from @kubernetes/client-node. */
export interface ContainerStateTerminated {
    /**
     * Container\'s ID in the format \'docker://<container_id>\'
     */
    'containerID'?: string;
    /**
     * Time at which the container last terminated
     */
    'finishedAt'?: Date;
    /**
     * Exit status from the last termination of the container
     */
    'exitCode': number;
    /**
     * Message regarding the last termination of the container
     */
    'message'?: string;
    /**
     * (brief) reason from the last termination of the container
     */
    'reason'?: string;
    /**
     * Signal from the last termination of the container
     */
    'signal'?: number;
    /**
     * Time at which previous execution of the container started
     */
    'startedAt'?: Date;
}

/** Extracted from @kubernetes/client-node. */
export interface ContainerStateWaiting {
    /**
     * Message regarding why the container is not yet running.
     */
    'message'?: string;
    /**
     * (brief) reason the container is not yet running.
     */
    'reason'?: string;
}

/** Extracted from @kubernetes/client-node. */
export interface ContainerState {
    'running'?: ContainerStateRunning;
    'terminated'?: ContainerStateTerminated;
    'waiting'?: ContainerStateWaiting;
}

/** Extracted from @kubernetes/client-node. */
export interface ContainerStatus {
    /**
     * Container\'s ID in the format \'docker://<container_id>\'.
     */
    'containerID'?: string;
    /**
     * The image the container is running. More info: https://kubernetes.io/docs/concepts/containers/images
     */
    'image': string;
    /**
     * ImageID of the container\'s image.
     */
    'imageID': string;
    'lastState'?: ContainerState;
    /**
     * This must be a DNS_LABEL. Each container in a pod must have a unique name. Cannot be updated.
     */
    'name': string;
    /**
     * Specifies whether the container has passed its readiness probe.
     */
    'ready': boolean;
    /**
     * The number of times the container has been restarted, currently based on the number of dead containers that have not yet been removed. Note that this is calculated from dead containers. But those containers are subject to garbage collection. This value will get capped at 5 by GC.
     */
    'restartCount': number;
    'state'?: ContainerState;
}

/** Extracted from @kubernetes/client-node. */
export interface PodCondition {
    'lastProbeTime'?: Date;
    /**
     * Last time the condition transitioned from one status to another.
     */
    'lastTransitionTime'?: Date;
    /**
     * Human-readable message indicating details about last transition.
     */
    'message'?: string;
    /**
     * Unique, one-word, CamelCase reason for the condition\'s last transition.
     */
    'reason'?: string;
    /**
     * Status is the status of the condition. Can be True, False, Unknown. More info: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle#pod-conditions
     */
    'status': string;
    /**
     * Type is the type of the condition. More info: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle#pod-conditions
     */
    'type': string;
}

/** Extracted from @kubernetes/client-node. */
export interface PodStatus {
    /**
     * Current service state of pod. More info: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle#pod-conditions
     */
    'conditions'?: PodCondition[];
    /**
     * The list has one entry per container in the manifest. Each entry is currently the output of `docker inspect`. More info: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle#pod-and-container-status
     */
    'containerStatuses'?: ContainerStatus[];
    /**
     * IP address of the host to which the pod is assigned. Empty if not yet scheduled.
     */
    'hostIP'?: string;
    /**
     * The list has one entry per init container in the manifest. The most recent successful init container will have ready = true, the most recently started container will have startTime set. More info: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle#pod-and-container-status
     */
    'initContainerStatuses'?: ContainerStatus[];
    /**
     * A human readable message indicating details about why the pod is in this condition.
     */
    'message'?: string;
    /**
     * nominatedNodeName is set only when this pod preempts other pods on the node, but it cannot be scheduled right away as preemption victims receive their graceful termination periods. This field does not guarantee that the pod will be scheduled on this node. Scheduler may decide to place the pod elsewhere if other nodes become available sooner. Scheduler may also decide to give the resources on this node to a higher priority pod that is created after preemption. As a result, this field may be different than PodSpec.nodeName when the pod is scheduled.
     */
    'nominatedNodeName'?: string;
    /**
     * The phase of a Pod is a simple, high-level summary of where the Pod is in its lifecycle. The conditions array, the reason and message fields, and the individual container status arrays contain more detail about the pod\'s status. There are five possible phase values:  Pending: The pod has been accepted by the Kubernetes system, but one or more of the container images has not been created. This includes time before being scheduled as well as time spent downloading images over the network, which could take a while. Running: The pod has been bound to a node, and all of the containers have been created. At least one container is still running, or is in the process of starting or restarting. Succeeded: All containers in the pod have terminated in success, and will not be restarted. Failed: All containers in the pod have terminated, and at least one container has terminated in failure. The container either exited with non-zero status or was terminated by the system. Unknown: For some reason the state of the pod could not be obtained, typically due to an error in communicating with the host of the pod.  More info: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle#pod-phase
     */
    'phase'?: string;
    /**
     * IP address allocated to the pod. Routable at least within the cluster. Empty if not yet allocated.
     */
    'podIP'?: string;
    /**
     * The Quality of Service (QOS) classification assigned to the pod based on resource requirements See PodQOSClass type for available QOS classes More info: https://git.k8s.io/community/contributors/design-proposals/node/resource-qos.md
     */
    'qosClass'?: string;
    /**
     * A brief CamelCase message indicating details about why the pod is in this state. e.g. \'Evicted\'
     */
    'reason'?: string;
    /**
     * RFC 3339 date and time at which the object was acknowledged by the Kubelet. This is before the Kubelet pulled the container image(s) for the pod.
     */
    'startTime'?: Date;
}

/** Recognize date values and convert them to Date objects. */
function dateConverter(key: string, value: any): any {
    if (value && typeof value === "string" && /^[1-9]\d*-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(?:\.\d+)?Z$/.test(value)) {
        return new Date(value);
    }
    return value;
}

export function parsePodStatus(pod: K8sPodStateSubscription["K8Pod"][0]): PodStatus | undefined {
    if (!pod?.statusJSON) {
        return undefined;
    }
    try {
        const status: PodStatus = JSON.parse(pod.statusJSON, dateConverter);
        return status;
    } catch (e) {
        throw new Error(`Failed to parse status of pod ${pod.namespace}/$pod.{name}: ${e.message}`);
    }
}
