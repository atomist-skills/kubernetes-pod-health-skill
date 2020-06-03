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

/** K8sPodState [[handler]] skill parameters. */
export interface K8sPodStateConfiguration {
    /** Chat channels to sent alerts to. */
    channels: string[];
    /**
     * Alert if pod container restarts exceeds this value, set to `"0"` to disable.  This value will be parsed as a
     * base-10 integer and used to populate [[K8sPodCheckConfiguration.maxRestarts]].
     */
    maxRestarts?: string;
    /**
     * Alert when containers are not ready after this number of minutes, set to `"0"` to disable.  This value will be
     * parsed as a base-10 integer and used to populate [[K8sPodCheckConfiguration.notReadyDelaySeconds]].
     */
    notReadyDelay?: string;
}

/** Kubernetes pod checker configuration parameters. */
export interface K8sPodCheckParameters {
    /** Whether to alert for containers in CrashLoopBackoff. */
    crashLoopBackOff: boolean;
    /** Whether to alert for containers in ImagePullBackoff. */
    imagePullBackOff: boolean;
    /** Alert when init container fails more times than this, set to `0` to disable. */
    initContainerFailureCount: number;
    /** Alert if pod container restarts exceeds this value, set to `0` to disable. */
    maxRestarts: number;
    /** Alert when containers are not ready after this number of seconds, set to `0` to disable. */
    notReadyDelaySeconds: number;
    /** Alert when pod has not been scheduled after this number of minutes, set to `0` to disable. */
    notScheduledDelaySeconds: number;
    /** Alert when container has been OOMKilled. */
    oomKilled: boolean;
    /**
     * Regular expression matching Kubernetes clusters whose pods should be reported on.  If not provided, all clusters
     * not matching [[clusterExcludeRegExp]] are reported on.  The cluster for a pod is obtained from the k8vent
     * environment property.
     */
    clusterIncludeRegExp?: string;
    /** Regular expression matching Kubernetes clusters whose pods should _not_ be reported on. */
    clusterExcludeRegExp?: string;
    /**
     * Regular expression matching namespaces whose pods should be reported on.  If not provided, all namespaces not
     * matching [[namespaceExcludeRegExp]] are reported on.
     */
    namespaceIncludeRegExp?: string;
    /** Regular expression matching namespaces whose pods should _not_ be reported on. */
    namespaceExcludeRegExp?: string;
}

/**
 * Use the provided [[K8sPodStateConfiguration]] to create a [[K8sPodCheckConfiguration]].
 *
 * @param params User-provided skill configuration parameters
 * @return Kubernetes pod checker configuration
 */
export function configurationToParameters(params: K8sPodStateConfiguration): K8sPodCheckParameters {
    if (!params.channels || params.channels.length < 1) {
        throw new Error(`Missing required configuration parameter: channels: ${JSON.stringify(params.channels)}`);
    }
    const maxRestarts = (params.maxRestarts) ? parseInt(params.maxRestarts, 10) : 10;
    const notReadyDelaySeconds = (params.notReadyDelay) ? parseInt(params.notReadyDelay) * 60 : 600;
    return {
        crashLoopBackOff: true,
        imagePullBackOff: true,
        initContainerFailureCount: 3,
        maxRestarts,
        namespaceExcludeRegExp: "^kube-",
        notReadyDelaySeconds,
        notScheduledDelaySeconds: 600,
        oomKilled: true,
    };
}
