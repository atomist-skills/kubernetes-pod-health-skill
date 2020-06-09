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

import { kubernetesResourceProvider, slackResourceProvider } from "@atomist/skill/lib/resource_providers";
import { DispatchStyle, ParameterType, ParameterVisibility, skill } from "@atomist/skill/lib/skill";
import { K8sPodStateConfiguration } from "./lib/parameter";

export const Skill = skill<K8sPodStateConfiguration>({

    dispatchStyle: DispatchStyle.Single,

    runtime: {
        memory: 256,
    },

    resourceProviders: {
        k8s: kubernetesResourceProvider({
            description: "Kubernetes cluster to monitor",
            minRequired: 1,
        }),
        slack: slackResourceProvider({ minRequired: 1, maxAllowed: 1 }),
    },

    parameters: {
        channels: {
            type: ParameterType.ChatChannels,
            displayName: "Chat channels to send alerts to",
            description: "Specify the chat channels where the alerts should be sent. You must specify at least one chat channel.",
            required: true,
            minRequired: 1,
        },
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
            visibility: ParameterVisibility.Normal,
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
            visibility: ParameterVisibility.Normal,
        },
    },

    subscriptions: [
        "file://**/subscription/*.graphql",
    ],

});
