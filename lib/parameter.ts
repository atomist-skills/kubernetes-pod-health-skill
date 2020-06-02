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

/** K8sPodState skill parameters. */
export interface K8sPodStateConfiguration {
    /** Chat channels to sent alerts to. */
    channels: string[];
    /**
     * Regular expression matching Kubernetes clusters whose pods
     * should be reported on.  If not provided, all clusters not
     * matching [[clusterExcludeRegExp]] are reported on.  The cluster
     * for a pod is obtained from the k8vent environment property.
     */
    clusterIncludeRegExp?: string;
    /** Regular expression matching Kubernetes clusters whose pods should _not_ be reported on. */
    clusterExcludeRegExp?: string;
    /** Whether to alert for containers in CrashLoopBackoff. */
    crashLoopBackOff?: boolean;
    /** Whether to alert for containers in ImagePullBackoff. */
    imagePullBackOff?: boolean;
    /** Alert when init container fails more times than this, set to `0` to disable. */
    initContainerFailureCount?: number;
    /** How often to alert a given condition, in minutes. */
    intervalMinutes?: number;
    /**
     * Alert if pod container restarts exceeds this value, set to `"0"` to disable.  This value will be parsed as a
     * base-10 integer and used to populated [[maxRestarts]].  If both this property and [[maxRestarts]] are set, the
     * latter takes precedence.
     */
    maxRestartsString?: string;
    /** Alert if pod container restarts exceeds this value, set to `0` to disable. */
    maxRestarts?: number;
    /**
     * Regular expression matching namespaces whose pods should be
     * reported on.  If not provided, all namespaces not matching
     * [[namespaceExcludeRegExp]] are reported on.
     */
    namespaceIncludeRegExp?: string;
    /** Regular expression matching namespaces whose pods should _not_ be reported on. */
    namespaceExcludeRegExp?: string;
    /**
     * Alert when containers are not ready after this number of minutes, set to `"0"` to disable.  This value will be
     * parsed as a base-10 integer and used to populated [[notReadyDelaySeconds]].  If both this property and
     * [[notReadyDelaySeconds]] are set, the latter takes precedence.
     */
    notReadyDelay?: string;
    /** Alert when containers are not ready after this number of seconds, set to `0` to disable. */
    notReadyDelaySeconds?: number;
    /** Alert when pod has not been scheduled after this number of minutes, set to `0` to disable. */
    notScheduledDelaySeconds?: number;
    /** Alert when container has been OOMKilled. */
    oomKilled?: boolean;
}

/**
 * Ensure all parameter properties are set, using defaults if the
 * property has not been set.  This function modifies the provided
 * params object.
 *
 * @param params User-provided configuration parameters
 */
export function parameterDefaults(params: K8sPodStateConfiguration): void {
    if (!params.channels || params.channels.length < 1) {
        throw new Error(`Missing required configuration parameter: channels: ${JSON.stringify(params.channels)}`);
    }
    params.imagePullBackOff = params.imagePullBackOff !== false;
    params.crashLoopBackOff = params.crashLoopBackOff !== false;
    params.oomKilled = params.oomKilled !== false;
    params.initContainerFailureCount = (params.initContainerFailureCount <= 0) ? 0 : (params.initContainerFailureCount || 3);
    params.intervalMinutes = (params.intervalMinutes <= 0) ? 0 : (params.intervalMinutes || 1440);
    if (params.maxRestarts <= 0) {
        params.maxRestarts = 0;
    } else if (!params.maxRestarts) {
        if (params.maxRestartsString) {
            params.maxRestarts = parseInt(params.maxRestartsString, 10);
        } else {
            params.maxRestarts = 10;
        }
    }
    delete params.maxRestartsString;
    params.namespaceExcludeRegExp = params.namespaceExcludeRegExp || "^kube-";
    if (params.notReadyDelaySeconds <= 0) {
        params.notReadyDelaySeconds = 0;
    } else if (!params.notReadyDelaySeconds) {
        if (params.notReadyDelay) {
            params.notReadyDelaySeconds = parseInt(params.notReadyDelay) * 60;
        } else {
            params.notReadyDelaySeconds = 600;
        }
    }
    delete params.notReadyDelay;
    params.notScheduledDelaySeconds = (params.notScheduledDelaySeconds <= 0) ? 0 : (params.notScheduledDelaySeconds || 600);
}
