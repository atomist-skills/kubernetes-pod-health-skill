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

import {
    ParameterType,
    ParameterVisibility,
    skill,
} from "@atomist/skill/lib/skill";
import { K8sPodStateConfiguration } from "./lib/parameter";

export const Skill = skill<Pick<K8sPodStateConfiguration, "channels" | "maxRestarts" | "notReadyDelay">>({

    runtime: {
        memory: 256,
    },

    parameters: {
        channels: {
            type: ParameterType.StringArray,
            displayName: "Chat channels to send alerts to",
            description: "Specify the chat channels where the alerts should be sent. You must specify at least one chat channel.",
            required: true,
            minRequired: 1,
        },
        // intervalMinutes: {
        //     type: ParameterType.Int,
        //     displayName: "Minimum interval in minutes between alerts for a pod/container",
        //     description: "Set this to the minimum number of minutes between receiving alerts for a specific pod container.  The default value, `1440`, sets the interval such that at most one alert message is created per pod container per day.",
        //     defaultValue: 1440,
        //     placeHolder: "1440",
        //     minimum: 1,
        //     required: true,
        // },
        // crashLoopBackOff: {
        //     type: ParameterType.Boolean,
        //     displayName: "Alert when pod container in crash loop back off?",
        //     description: "Select if you want to get alerts if a container in a pod is repeatedly crashing.",
        //     defaultValue: true,
        //     required: true,
        // },
        // imagePullBackOff: {
        //     type: ParameterType.Boolean,
        //     displayName: "Alert when pod container in image pull back off?",
        //     description: "Select if you want to get alerts if the node is unable to pull the Docker image of a container in a pod.",
        //     defaultValue: true,
        //     required: true,
        // },
        // oomKilled: {
        //     type: ParameterType.Boolean,
        //     displayName: "Alert when pod container has been OOMKilled?",
        //     description: "Select if you want to get alerts if a container in a pod has been killed because of an out-of-memory issue.",
        //     defaultValue: true,
        //     required: true,
        // },
        // initContainerFailureCount: {
        //     type: ParameterType.Int,
        //     displayName: "Alert when pod init container fails more than this many times",
        //     description: "Set this to the number of init container failures you want to ignore before sending an alert.  The default value is `2`.  Set to `0` to disable this alert.",
        //     defaultValue: 3,
        //     placeHolder: "3",
        //     minimum: 0,
        //     required: true,
        // },
        maxRestarts: {
            type: ParameterType.SingleChoice,
            displayName: "Pod container restarts",
            description: "Alert if the count of pod container restarts reaches this value or higher.",
            defaultValue: "10",
            options: [{
                description: "Do not alert based on pod container restarts",
                text: "Disable",
                value: "0",
            }, {
                description: "Alert after five restarts",
                text: "5 restarts",
                value: "5",
            }, {
                description: "Alert after ten restarts",
                text: "10 restarts",
                value: "10",
            }, {
                description: "Alert after 25 restarts",
                text: "25 restarts",
                value: "25",
            }],
            required: true,
            visibility: ParameterVisibility.Advanced,
        },
        notReadyDelay: {
            type: ParameterType.SingleChoice,
            displayName: "Pod container not ready",
            description: "Alert if pod container is not ready after this amount of time.",
            defaultValue: "10",
            options: [{
                description: "Do not alert based on pod container readiness",
                text: "Disable",
                value: "0",
            }, {
                description: "Alert after five minutes",
                text: "5 minutes",
                value: "5",
            }, {
                description: "Alert after ten minutes",
                text: "10 minutes",
                value: "10",
            }, {
                description: "Alert after 30 minutes",
                text: "30 minutes",
                value: "30",
            }, {
                description: "Alert after one hour",
                text: "1 hour",
                value: "60",
            }],
            required: true,
            visibility: ParameterVisibility.Advanced,
        },
        // notScheduledDelaySeconds: {
        //     type: ParameterType.Int,
        //     displayName: "Alert if pod is not scheduled after this number of seconds",
        //     description: "Set this to the number seconds to wait after a pod is created before sending an alert if the pod is not yet scheduled.  The default value is `600`, i.e., 10 minutes.  Set to `0` to disable this alert.",
        //     defaultValue: 600,
        //     placeHolder: "600",
        //     minimum: 0,
        //     required: false,
        // },
        // clusterIncludeRegExp: {
        //     type: ParameterType.String,
        //     displayName: "Only alert on pods in Kubernetes clusters matching this regular expression",
        //     description: "If provided, only pods in Kubernetes clusters matching the regular expression will be reported on.  If not provided, all clusters are implicitly included.",
        //     required: false,
        // },
        // clusterExcludeRegExp: {
        //     type: ParameterType.String,
        //     displayName: "Only alert on pods in Kubernetes clusters _not_ matching this regular expression",
        //     description: "If provided, only pods in Kubernetes clusters _not_ matching the regular expression will be reported on.  If not provided, no clusters are explicitly excluded.",
        //     required: false,
        // },
        // namespaceIncludeRegExp: {
        //     type: ParameterType.String,
        //     displayName: "Only alert on pods in namespaces matching this regular expression",
        //     description: "If provided, only pods in namespaces matching the regular expression will be reported on.  If not provided, all namespaces are implicitly included.",
        //     required: false,
        // },
        // namespaceExcludeRegExp: {
        //     type: ParameterType.String,
        //     displayName: "Only alert on pods in namespaces _not_ matching this regular expression",
        //     description: "If provided, only pods in namespaces _not_ matching the regular expression will be reported on.  If not provided, the default value is `^kube-`, which excludes all namespaces starting with \"kube-\".",
        //     defaultValue: "^kube-",
        //     placeHolder: "^kube-",
        //     required: false,
        // },
    },

    subscriptions: [
        "file://**/subscription/*.graphql"
    ]

});
