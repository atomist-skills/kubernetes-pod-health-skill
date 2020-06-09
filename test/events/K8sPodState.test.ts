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

import * as log from "@atomist/skill/lib/log";
import * as assert from "power-assert";
import { handler } from "../../lib/events/K8sPodState";

describe("K8sPodState", () => {

    describe("handler", () => {

        let originalLogInfo: any;
        before(() => {
            originalLogInfo = Object.getOwnPropertyDescriptor(log, "info");
            Object.defineProperty(log, "info", { value: async () => { return; } });
        });
        after(() => {
            Object.defineProperty(log, "info", originalLogInfo);
        });

        interface Destination {
            channels: string[];
            users: string[];
        }
        interface Sent {
            message: string;
            destination: Destination;
            options: any;
        }

        function generateContext(data: any, sent: Sent[], logs: string[]): any {
            const r: any = {
                audit: {
                    log: async (l: string): Promise<void> => { logs.push(l); },
                },
                configuration: [
                    {
                        name: "testing",
                        parameters: {
                            channels: [
                                {
                                    channelName: "prod-alerts",
                                    channelId: "CS23XNAGH",
                                    chatTeamId: "T7GMF5USG",
                                    resourceProviderId: "slack",
                                },
                                {
                                    channelName: "managers",
                                    channelId: "CQKPQV7U2",
                                    chatTeamId: "T7GMF5USG",
                                    resourceProviderId: "slack",
                                },
                                {
                                    channelName: "devs",
                                    channelId: "CDW6ZU86B",
                                    chatTeamId: "T7GMF5USG",
                                    resourceProviderId: "slack",
                                },
                            ],
                            maxRestarts: "10",
                            notReadyDelay: "10",
                        },
                        resourceProviders: {
                            gcp: {
                                typeName: "KubernetesClusterProvider",
                                selectedResourceProviders: [
                                    { id: "AW04K5PID_11111111-2222-aaaa-bbbb-999999999999" },
                                    { id: "AW04K5PID_33333333-4444-cccc-dddd-888888888888" },
                                ],
                            },
                            slack: {
                                typeName: "SlackChatProvider",
                                selectedResourceProviders: [{ id: "T5L4CK1D" }],
                            },
                        },
                    },
                ],
                data,
                graphql: {
                    query: async (q: string, p: Record<string, any>): Promise<any> => {
                        if (q === "chatChannel.graphql") {
                            assert.deepStrictEqual(p, { channels: ["prod-alerts", "managers", "devs"] });
                            return {
                                ChatChannel: [
                                    {
                                        archived: null,
                                        channelId: "CDW6ZU86B",
                                        id: "T7GMF5USG_CDW6ZU86B",
                                        name: "devs",
                                        provider: "slack",
                                    },
                                    {
                                        archived: true,
                                        channelId: "CQKPQV7U2",
                                        id: "T7GMF5USG_CQKPQV7U2",
                                        name: "managers",
                                        provider: "slack",
                                    },
                                    {
                                        archived: false,
                                        channelId: "CS23XNAGH",
                                        id: "T7GMF5USG_CS23XNAGH",
                                        name: "prod-alerts",
                                        provider: "slack",
                                    },
                                ],
                            };
                        } else if (q === "kubernetesClusterProvider.graphql") {
                            if (p.id === "AW04K5PID_11111111-2222-aaaa-bbbb-999999999999") {
                                return { KubernetesClusterProvider: [{ name: "k8s-internal-staging" }] };
                            } else if (p.id === "AW04K5PID_33333333-4444-cccc-dddd-888888888888") {
                                return { KubernetesClusterProvider: [{ name: "k8s-internal-demo" }] };
                            } else {
                                return { KubernetesClusterProvider: [] };
                            }
                        } else {
                            assert.fail(`unrecognized GraphQL query file: ${q}`);
                        }
                    },
                },
                message: {
                    delete: async (destination: Destination, options?: any): Promise<void> => {
                        sent.push({ message: "DELETE", destination, options });
                    },
                    send: async (message: string, destination: Destination, options?: any): Promise<any> => {
                        sent.push({ message, destination, options });
                    },
                },
            };
            return r;
        }

        function padNumber(n: number): string {
            return (n < 10) ? `0${n}` : `${n}`;
        }

        function ageString(d: Date): string {
            const y = d.getUTCFullYear();
            const m = padNumber(d.getUTCMonth() + 1);
            const a = padNumber(d.getUTCDate());
            const h = padNumber(d.getUTCHours());
            const n = padNumber(d.getUTCMinutes());
            const s = padNumber(d.getUTCSeconds());
            return `${y}-${m}-${a}T${h}:${n}:${s}Z`;
        }

        it("concludes everything is okay", async () => {
            const d = {
                K8Pod: [
                    {
                        baseName: "init",
                        name: "init-sleep",
                        resourceVersion: 158190338,
                        phase: "Running",
                        containers: [
                            {
                                stateReason: "",
                                ready: true,
                                name: "sleep",
                                restartCount: 0,
                                resourceVersion: 158190338,
                                state: "running",
                                containerID: "containerd://7441f1838a5bbc3e318b6afdacfbd348e1ef18d53ef485e9a2abc4483a4665dd",
                                image: {
                                    commits: [] as any[],
                                },
                                environment: "k8s-internal-demo",
                                imageName: "busybox:1.31.1-uclibc",
                                timestamp: "2020-03-18T18:15:50.548Z",
                                statusJSON: "{\"name\":\"sleep\",\"state\":{\"running\":{\"startedAt\":\"2020-03-19T19:23:21Z\"}},\"lastState\":{},\"ready\":true,\"restartCount\":0,\"image\":\"docker.io/library/busybox:1.31.1-uclibc\",\"imageID\":\"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51\",\"containerID\":\"containerd://a35f0076125fc74de40e1716236aee1c15e6ca54d71620cdc993ddea5cb195cd\"}",
                            },
                        ],
                        environment: "k8s-internal-demo",
                        timestamp: "2020-03-19T19:23:09Z",
                        statusJSON: "{\"phase\":\"Running\",\"conditions\":[{\"type\":\"Initialized\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-19T19:23:21Z\"},{\"type\":\"Ready\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-19T19:23:22Z\"},{\"type\":\"ContainersReady\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-19T19:23:22Z\"},{\"type\":\"PodScheduled\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-19T19:23:09Z\"}],\"hostIP\":\"10.0.3.197\",\"podIP\":\"10.12.0.29\",\"startTime\":\"2020-03-19T19:23:09Z\",\"initContainerStatuses\":[{\"name\":\"success\",\"state\":{\"terminated\":{\"exitCode\":0,\"reason\":\"Completed\",\"startedAt\":\"2020-03-19T19:23:10Z\",\"finishedAt\":\"2020-03-19T19:23:20Z\",\"containerID\":\"containerd://701bc329ef85396fa59e94c5cead8cbbe5210f086619c90dce7b1f3bd02aaf1e\"}},\"lastState\":{},\"ready\":true,\"restartCount\":0,\"image\":\"docker.io/library/busybox:1.31.1-uclibc\",\"imageID\":\"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51\",\"containerID\":\"containerd://701bc329ef85396fa59e94c5cead8cbbe5210f086619c90dce7b1f3bd02aaf1e\"}],\"containerStatuses\":[{\"name\":\"sleep\",\"state\":{\"running\":{\"startedAt\":\"2020-03-19T19:23:21Z\"}},\"lastState\":{},\"ready\":true,\"restartCount\":0,\"image\":\"docker.io/library/busybox:1.31.1-uclibc\",\"imageID\":\"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51\",\"containerID\":\"containerd://a35f0076125fc74de40e1716236aee1c15e6ca54d71620cdc993ddea5cb195cd\"}],\"qosClass\":\"BestEffort\"}",
                        namespace: "production",
                    },
                ],
            };
            const s: Sent[] = [];
            const l: string[] = [];
            const c = generateContext(d, s, l);
            const r = await handler(c);
            const e = {
                code: 0,
                reason: "All pods healthy",
                visibility: "hidden",
            };
            assert.deepStrictEqual(r, e);
            const es = [
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: "Pod production/init-sleep in Kubernetes cluster k8s-internal-demo recovered",
                    options: {
                        id: "testing:k8s-internal-demo:production:init-sleep",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: "Init container success (docker.io/library/busybox:1.31.1-uclibc) of pod production/init-sleep in Kubernetes cluster k8s-internal-demo recovered",
                    options: {
                        id: "testing:k8s-internal-demo:production:init-sleep:init:success",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: "Container sleep (docker.io/library/busybox:1.31.1-uclibc) of pod production/init-sleep in Kubernetes cluster k8s-internal-demo recovered",
                    options: {
                        id: "testing:k8s-internal-demo:production:init-sleep:sleep",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
            ];
            assert.deepStrictEqual(s, es);
            const el: string[] = [];
            assert.deepStrictEqual(l, el);
        });

        it("ignores problems in clusters not in integrations", async () => {
            const d = {
                K8Pod: [
                    {
                        baseName: "crash-loop",
                        name: "crash-loop",
                        resourceVersion: 157792924,
                        phase: "Running",
                        containers: [
                            {
                                stateReason: "CrashLoopBackOff",
                                ready: false,
                                name: "sleep",
                                restartCount: 2,
                                resourceVersion: 157792924,
                                state: "waiting",
                                containerID: "containerd://7441f1838a5bbc3e318b6afdacfbd348e1ef18d53ef485e9a2abc4483a4665dd",
                                image: {
                                    commits: [] as any[],
                                },
                                environment: "k9s-internal-demo",
                                imageName: "busybox:1.31.1-uclibc",
                                timestamp: "2020-03-18T18:15:50.548Z",
                                statusJSON: "{\"name\":\"sleep\",\"state\":{\"waiting\":{\"reason\":\"CrashLoopBackOff\",\"message\":\"Back-off 20s restarting failed container=sleep pod=crash-loop_production(a689804f-5628-4377-916d-c7889a5539cb)\"}},\"lastState\":{\"terminated\":{\"exitCode\":0,\"reason\":\"Completed\",\"startedAt\":\"2020-03-18T18:16:23Z\",\"finishedAt\":\"2020-03-18T18:16:33Z\",\"containerID\":\"containerd://b5b301bf493cca046a9b1598b3769a6215f89ac119837db06b1f12a63401dd81\"}},\"ready\":false,\"restartCount\":2,\"image\":\"docker.io/library/busybox:1.31.1-uclibc\",\"imageID\":\"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51\",\"containerID\":\"containerd://b5b301bf493cca046a9b1598b3769a6215f89ac119837db06b1f12a63401dd81\"}",
                            },
                        ],
                        environment: "k9s-internal-demo",
                        timestamp: "2020-03-18T18:15:48Z",
                        statusJSON: "{\"phase\":\"Running\",\"conditions\":[{\"type\":\"Initialized\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-18T18:15:48Z\"},{\"type\":\"Ready\",\"status\":\"False\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-18T18:16:33Z\",\"reason\":\"ContainersNotReady\",\"message\":\"containers with unready status: [sleep]\"},{\"type\":\"ContainersReady\",\"status\":\"False\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-18T18:16:33Z\",\"reason\":\"ContainersNotReady\",\"message\":\"containers with unready status: [sleep]\"},{\"type\":\"PodScheduled\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-18T18:15:48Z\"}],\"hostIP\":\"10.0.3.197\",\"podIP\":\"10.12.0.24\",\"startTime\":\"2020-03-18T18:15:48Z\",\"containerStatuses\":[{\"name\":\"sleep\",\"state\":{\"waiting\":{\"reason\":\"CrashLoopBackOff\",\"message\":\"Back-off 20s restarting failed container=sleep pod=crash-loop_production(a689804f-5628-4377-916d-c7889a5539cb)\"}},\"lastState\":{\"terminated\":{\"exitCode\":0,\"reason\":\"Completed\",\"startedAt\":\"2020-03-18T18:16:23Z\",\"finishedAt\":\"2020-03-18T18:16:33Z\",\"containerID\":\"containerd://b5b301bf493cca046a9b1598b3769a6215f89ac119837db06b1f12a63401dd81\"}},\"ready\":false,\"restartCount\":2,\"image\":\"docker.io/library/busybox:1.31.1-uclibc\",\"imageID\":\"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51\",\"containerID\":\"containerd://b5b301bf493cca046a9b1598b3769a6215f89ac119837db06b1f12a63401dd81\"}],\"qosClass\":\"BestEffort\"}",
                        namespace: "kube-something",
                    },
                ],
            };
            const s: Sent[] = [];
            const l: string[] = [];
            const c = generateContext(d, s, l);
            const r = await handler(c);
            const e = {
                code: 0,
                reason: "All pods healthy",
                visibility: "hidden",
            };
            assert.deepStrictEqual(r, e);
            const es: Sent[] = [];
            assert.deepStrictEqual(s, es);
            const el = [
                "Environment k9s-internal-demo of pod kube-something/crash-loop in Kubernetes cluster k9s-internal-demo does not match k8s integrations in configuration testing",
            ];
            assert.deepStrictEqual(l, el);
        });

        it("ignores problems in excluded namespaces", async () => {
            const d = {
                K8Pod: [
                    {
                        baseName: "crash-loop",
                        name: "crash-loop",
                        resourceVersion: 157792924,
                        phase: "Running",
                        containers: [
                            {
                                stateReason: "CrashLoopBackOff",
                                ready: false,
                                name: "sleep",
                                restartCount: 2,
                                resourceVersion: 157792924,
                                state: "waiting",
                                containerID: "containerd://7441f1838a5bbc3e318b6afdacfbd348e1ef18d53ef485e9a2abc4483a4665dd",
                                image: {
                                    commits: [] as any[],
                                },
                                environment: "k8s-internal-demo",
                                imageName: "busybox:1.31.1-uclibc",
                                timestamp: "2020-03-18T18:15:50.548Z",
                                statusJSON: "{\"name\":\"sleep\",\"state\":{\"waiting\":{\"reason\":\"CrashLoopBackOff\",\"message\":\"Back-off 20s restarting failed container=sleep pod=crash-loop_production(a689804f-5628-4377-916d-c7889a5539cb)\"}},\"lastState\":{\"terminated\":{\"exitCode\":0,\"reason\":\"Completed\",\"startedAt\":\"2020-03-18T18:16:23Z\",\"finishedAt\":\"2020-03-18T18:16:33Z\",\"containerID\":\"containerd://b5b301bf493cca046a9b1598b3769a6215f89ac119837db06b1f12a63401dd81\"}},\"ready\":false,\"restartCount\":2,\"image\":\"docker.io/library/busybox:1.31.1-uclibc\",\"imageID\":\"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51\",\"containerID\":\"containerd://b5b301bf493cca046a9b1598b3769a6215f89ac119837db06b1f12a63401dd81\"}",
                            },
                        ],
                        environment: "k8s-internal-demo",
                        timestamp: "2020-03-18T18:15:48Z",
                        statusJSON: "{\"phase\":\"Running\",\"conditions\":[{\"type\":\"Initialized\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-18T18:15:48Z\"},{\"type\":\"Ready\",\"status\":\"False\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-18T18:16:33Z\",\"reason\":\"ContainersNotReady\",\"message\":\"containers with unready status: [sleep]\"},{\"type\":\"ContainersReady\",\"status\":\"False\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-18T18:16:33Z\",\"reason\":\"ContainersNotReady\",\"message\":\"containers with unready status: [sleep]\"},{\"type\":\"PodScheduled\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-18T18:15:48Z\"}],\"hostIP\":\"10.0.3.197\",\"podIP\":\"10.12.0.24\",\"startTime\":\"2020-03-18T18:15:48Z\",\"containerStatuses\":[{\"name\":\"sleep\",\"state\":{\"waiting\":{\"reason\":\"CrashLoopBackOff\",\"message\":\"Back-off 20s restarting failed container=sleep pod=crash-loop_production(a689804f-5628-4377-916d-c7889a5539cb)\"}},\"lastState\":{\"terminated\":{\"exitCode\":0,\"reason\":\"Completed\",\"startedAt\":\"2020-03-18T18:16:23Z\",\"finishedAt\":\"2020-03-18T18:16:33Z\",\"containerID\":\"containerd://b5b301bf493cca046a9b1598b3769a6215f89ac119837db06b1f12a63401dd81\"}},\"ready\":false,\"restartCount\":2,\"image\":\"docker.io/library/busybox:1.31.1-uclibc\",\"imageID\":\"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51\",\"containerID\":\"containerd://b5b301bf493cca046a9b1598b3769a6215f89ac119837db06b1f12a63401dd81\"}],\"qosClass\":\"BestEffort\"}",
                        namespace: "kube-something",
                    },
                ],
            };
            const s: Sent[] = [];
            const l: string[] = [];
            const c = generateContext(d, s, l);
            const r = await handler(c);
            const e = {
                code: 0,
                reason: "All pods healthy",
                visibility: "hidden",
            };
            assert.deepStrictEqual(r, e);
            const es: Sent[] = [];
            assert.deepStrictEqual(s, es);
            const el: string[] = [];
            assert.deepStrictEqual(l, el);
        });

        it("detects when pod is not scheduled", async () => {
            const age = ageString(new Date(new Date().getTime() - 20 * 60 * 1000));
            const d = {
                K8Pod: [
                    {
                        baseName: "no-schedule",
                        name: "no-schedule",
                        resourceVersion: 158483664,
                        phase: "Pending",
                        containers: [] as any[],
                        environment: "k8s-internal-demo",
                        timestamp: age,
                        statusJSON: `{"phase":"Pending","conditions":[{"type":"PodScheduled","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-20T13:54:01Z","reason":"Unschedulable","message":"0/1 nodes are available: 1 Insufficient cpu, 1 Insufficient memory."}],"qosClass":"Burstable"}`,
                        namespace: "production",
                    },
                ],
            };
            const s: Sent[] = [];
            const l: string[] = [];
            const c = generateContext(d, s, l);
            const r = await handler(c);
            const em = "Pod production/no-schedule in Kubernetes cluster k8s-internal-demo has not been scheduled: `0/1 nodes are available: 1 Insufficient cpu, 1 Insufficient memory.`";
            const e = {
                code: 1,
                reason: em,
            };
            assert.deepStrictEqual(r, e);
            const es = [
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: em,
                    options: {
                        id: "testing:k8s-internal-demo:production:no-schedule",
                        ttl: 86400000,
                    },
                },
            ];
            assert.deepStrictEqual(s, es);
            const el = [em];
            assert.deepStrictEqual(l, el);
        });

        it("ignores when young pod is not scheduled", async () => {
            const age = ageString(new Date(new Date().getTime() - 5 * 60 * 1000));
            const d = {
                K8Pod: [
                    {
                        baseName: "no-schedule",
                        name: "no-schedule",
                        resourceVersion: 158483664,
                        phase: "Pending",
                        containers: [] as any[],
                        environment: "k8s-internal-demo",
                        timestamp: age,
                        statusJSON: `{"phase":"Pending","conditions":[{"type":"PodScheduled","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-20T13:54:01Z","reason":"Unschedulable","message":"0/1 nodes are available: 1 Insufficient cpu, 1 Insufficient memory."}],"qosClass":"Burstable"}`,
                        namespace: "production",
                    },
                ],
            };
            const s: Sent[] = [];
            const l: string[] = [];
            const c = generateContext(d, s, l);
            const r = await handler(c);
            const e = {
                code: 0,
                reason: "All pods healthy",
                visibility: "hidden",
            };
            assert.deepStrictEqual(r, e);
            const es = [
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: "Pod production/no-schedule in Kubernetes cluster k8s-internal-demo recovered",
                    options: {
                        id: "testing:k8s-internal-demo:production:no-schedule",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
            ];
            assert.deepStrictEqual(s, es);
            const el: string[] = [];
            assert.deepStrictEqual(l, el);
        });

        it("detects crash loop backoff", async () => {
            const d = {
                K8Pod: [
                    {
                        baseName: "crash-loop",
                        name: "crash-loop",
                        resourceVersion: 157792924,
                        phase: "Running",
                        containers: [
                            {
                                stateReason: "CrashLoopBackOff",
                                ready: false,
                                name: "sleep",
                                restartCount: 2,
                                resourceVersion: 157792924,
                                state: "waiting",
                                containerID: "containerd://7441f1838a5bbc3e318b6afdacfbd348e1ef18d53ef485e9a2abc4483a4665dd",
                                image: {
                                    commits: [] as any[],
                                },
                                environment: "k8s-internal-demo",
                                imageName: "busybox:1.31.1-uclibc",
                                timestamp: "2020-03-18T18:15:50.548Z",
                                statusJSON: "{\"name\":\"sleep\",\"state\":{\"waiting\":{\"reason\":\"CrashLoopBackOff\",\"message\":\"Back-off 20s restarting failed container=sleep pod=crash-loop_production(a689804f-5628-4377-916d-c7889a5539cb)\"}},\"lastState\":{\"terminated\":{\"exitCode\":0,\"reason\":\"Completed\",\"startedAt\":\"2020-03-18T18:16:23Z\",\"finishedAt\":\"2020-03-18T18:16:33Z\",\"containerID\":\"containerd://b5b301bf493cca046a9b1598b3769a6215f89ac119837db06b1f12a63401dd81\"}},\"ready\":false,\"restartCount\":2,\"image\":\"docker.io/library/busybox:1.31.1-uclibc\",\"imageID\":\"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51\",\"containerID\":\"containerd://b5b301bf493cca046a9b1598b3769a6215f89ac119837db06b1f12a63401dd81\"}",
                            },
                        ],
                        environment: "k8s-internal-demo",
                        timestamp: "2020-03-18T18:15:48Z",
                        statusJSON: "{\"phase\":\"Running\",\"conditions\":[{\"type\":\"Initialized\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-18T18:15:48Z\"},{\"type\":\"Ready\",\"status\":\"False\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-18T18:16:33Z\",\"reason\":\"ContainersNotReady\",\"message\":\"containers with unready status: [sleep]\"},{\"type\":\"ContainersReady\",\"status\":\"False\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-18T18:16:33Z\",\"reason\":\"ContainersNotReady\",\"message\":\"containers with unready status: [sleep]\"},{\"type\":\"PodScheduled\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-18T18:15:48Z\"}],\"hostIP\":\"10.0.3.197\",\"podIP\":\"10.12.0.24\",\"startTime\":\"2020-03-18T18:15:48Z\",\"containerStatuses\":[{\"name\":\"sleep\",\"state\":{\"waiting\":{\"reason\":\"CrashLoopBackOff\",\"message\":\"Back-off 20s restarting failed container=sleep pod=crash-loop_production(a689804f-5628-4377-916d-c7889a5539cb)\"}},\"lastState\":{\"terminated\":{\"exitCode\":0,\"reason\":\"Completed\",\"startedAt\":\"2020-03-18T18:16:23Z\",\"finishedAt\":\"2020-03-18T18:16:33Z\",\"containerID\":\"containerd://b5b301bf493cca046a9b1598b3769a6215f89ac119837db06b1f12a63401dd81\"}},\"ready\":false,\"restartCount\":2,\"image\":\"docker.io/library/busybox:1.31.1-uclibc\",\"imageID\":\"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51\",\"containerID\":\"containerd://b5b301bf493cca046a9b1598b3769a6215f89ac119837db06b1f12a63401dd81\"}],\"qosClass\":\"BestEffort\"}",
                        namespace: "production",
                    },
                ],
            };
            const s: Sent[] = [];
            const l: string[] = [];
            const c = generateContext(d, s, l);
            const r = await handler(c);
            const em = "Container sleep (docker.io/library/busybox:1.31.1-uclibc) of pod production/crash-loop in Kubernetes cluster k8s-internal-demo is in CrashLoopBackOff: `Back-off 20s restarting failed container=sleep pod=crash-loop_production(a689804f-5628-4377-916d-c7889a5539cb)`";
            const e = {
                code: 1,
                reason: em,
            };
            assert.deepStrictEqual(r, e);
            const es = [
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: "Pod production/crash-loop in Kubernetes cluster k8s-internal-demo recovered",
                    options: {
                        id: "testing:k8s-internal-demo:production:crash-loop",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: em,
                    options: {
                        id: "testing:k8s-internal-demo:production:crash-loop:sleep",
                        ttl: 86400000,
                    },
                },
            ];
            assert.deepStrictEqual(s, es);
            const el = [em];
            assert.deepStrictEqual(l, el);
        });

        it("detects image pull backoff", async () => {
            const d = {
                K8Pod: [
                    {
                        baseName: "image-pull-backoff",
                        name: "image-pull-backoff",
                        resourceVersion: 158112300,
                        phase: "Pending",
                        containers: [] as any[],
                        environment: "k8s-internal-demo",
                        timestamp: "2020-03-19T14:27:41Z",
                        statusJSON: "{\"phase\":\"Pending\",\"conditions\":[{\"type\":\"Initialized\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-19T14:27:41Z\"},{\"type\":\"Ready\",\"status\":\"False\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-19T14:27:41Z\",\"reason\":\"ContainersNotReady\",\"message\":\"containers with unready status: [nothing]\"},{\"type\":\"ContainersReady\",\"status\":\"False\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-19T14:27:41Z\",\"reason\":\"ContainersNotReady\",\"message\":\"containers with unready status: [nothing]\"},{\"type\":\"PodScheduled\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-19T14:27:41Z\"}],\"hostIP\":\"10.0.3.197\",\"podIP\":\"10.12.0.26\",\"startTime\":\"2020-03-19T14:27:41Z\",\"containerStatuses\":[{\"name\":\"nothing\",\"state\":{\"waiting\":{\"reason\":\"ImagePullBackOff\",\"message\":\"Back-off pulling image \\\"notanimage/thatexistsanywhere:badtag\\\"\"}},\"lastState\":{},\"ready\":false,\"restartCount\":0,\"image\":\"notanimage/thatexistsanywhere:badtag\",\"imageID\":\"\"}],\"qosClass\":\"BestEffort\"}",
                        namespace: "production",
                    },
                ],
            };
            const s: Sent[] = [];
            const l: string[] = [];
            const c = generateContext(d, s, l);
            const r = await handler(c);
            const em = "Container nothing (notanimage/thatexistsanywhere:badtag) of pod production/image-pull-backoff in Kubernetes cluster k8s-internal-demo is in ImagePullBackOff: `Back-off pulling image \"notanimage/thatexistsanywhere:badtag\"`";
            const e = {
                code: 1,
                reason: em,
            };
            assert.deepStrictEqual(r, e);
            const es = [
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: "Pod production/image-pull-backoff in Kubernetes cluster k8s-internal-demo recovered",
                    options: {
                        id: "testing:k8s-internal-demo:production:image-pull-backoff",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
                {
                    message: em,
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    options: {
                        id: "testing:k8s-internal-demo:production:image-pull-backoff:nothing",
                        ttl: 86400000,
                    },
                },
            ];
            assert.deepStrictEqual(s, es);
            const el = [em];
            assert.deepStrictEqual(l, el);
        });

        it("detects OOMKilled", async () => {
            const d = {
                K8Pod: [
                    {
                        baseName: "oom-kill",
                        name: "oom-kill",
                        resourceVersion: 158112300,
                        phase: "Failed",
                        containers: [] as any[],
                        environment: "k8s-internal-demo",
                        timestamp: "2020-03-19T14:27:41Z",
                        statusJSON: `{"conditions":[{"lastProbeTime":null,"lastTransitionTime":"2020-04-24T20:46:48Z","status":"True","type":"Initialized"},{"lastProbeTime":null,"lastTransitionTime":"2020-04-24T20:50:21Z","message":"containers with unready status: [kaniko]","reason":"ContainersNotReady","status":"False","type":"Ready"},{"lastProbeTime":null,"lastTransitionTime":"2020-04-24T20:50:21Z","message":"containers with unready status: [kaniko]","reason":"ContainersNotReady","status":"False","type":"ContainersReady"},{"lastProbeTime":null,"lastTransitionTime":"2020-04-24T20:46:44Z","status":"True","type":"PodScheduled"}],"containerStatuses":[{"containerID":"containerd://9987c0f9acdd7c416e4b9d937cfafa2616c188f2ed1fb2f10bd1525f10778c7e","image":"gcr.io/kaniko-project/executor:v0.19.0","imageID":"gcr.io/kaniko-project/executor@sha256:66be3f60f22b571faa82e0aaeb94731217ba0c58ac4a3b062bc84c6d8d545213","lastState":{},"name":"kaniko","ready":false,"restartCount":0,"state":{"terminated":{"containerID":"containerd://9987c0f9acdd7c416e4b9d937cfafa2616c188f2ed1fb2f10bd1525f10778c7e","exitCode":1,"finishedAt":"2020-04-24T20:50:21Z","reason":"OOMKilled","startedAt":"2020-04-24T20:46:48Z"}}}],"hostIP":"10.0.0.34","initContainerStatuses":[],"phase":"Failed","podIP":"10.60.4.62","qosClass":"Burstable","startTime":"2020-04-24T20:46:44Z"}`,
                        namespace: "production",
                    },
                ],
            };
            const s: Sent[] = [];
            const l: string[] = [];
            const c = generateContext(d, s, l);
            const r = await handler(c);
            const em = "Container kaniko (gcr.io/kaniko-project/executor:v0.19.0) of pod production/oom-kill in Kubernetes cluster k8s-internal-demo has been OOMKilled: `1`";
            const e = {
                code: 1,
                reason: em,
            };
            assert.deepStrictEqual(r, e);
            const es = [
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: "Pod production/oom-kill in Kubernetes cluster k8s-internal-demo recovered",
                    options: {
                        id: "testing:k8s-internal-demo:production:oom-kill",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
                {
                    message: em,
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    options: {
                        id: "testing:k8s-internal-demo:production:oom-kill:kaniko",
                        ttl: 86400000,
                    },
                },
            ];
            assert.deepStrictEqual(s, es);
            const el = [em];
            assert.deepStrictEqual(l, el);
        });

        it("detects init container failure", async () => {
            const d = {
                K8Pod: [
                    {
                        baseName: "init-fail",
                        name: "init-fail",
                        resourceVersion: 158171762,
                        phase: "Pending",
                        containers: [] as any[],
                        environment: "k8s-internal-demo",
                        timestamp: "2020-03-19T18:12:20Z",
                        statusJSON: "{\"phase\":\"Pending\",\"conditions\":[{\"type\":\"Initialized\",\"status\":\"False\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-19T18:12:20Z\",\"reason\":\"ContainersNotInitialized\",\"message\":\"containers with incomplete status: [fail]\"},{\"type\":\"Ready\",\"status\":\"False\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-19T18:12:20Z\",\"reason\":\"ContainersNotReady\",\"message\":\"containers with unready status: [sleep]\"},{\"type\":\"ContainersReady\",\"status\":\"False\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-19T18:12:20Z\",\"reason\":\"ContainersNotReady\",\"message\":\"containers with unready status: [sleep]\"},{\"type\":\"PodScheduled\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-19T18:12:20Z\"}],\"hostIP\":\"10.0.3.197\",\"podIP\":\"10.12.0.27\",\"startTime\":\"2020-03-19T18:12:20Z\",\"initContainerStatuses\":[{\"name\":\"fail\",\"state\":{\"terminated\":{\"exitCode\":1,\"reason\":\"Error\",\"startedAt\":\"2020-03-19T18:13:00Z\",\"finishedAt\":\"2020-03-19T18:13:00Z\",\"containerID\":\"containerd://702440f02a119413f98348e67417601436d05421736bf5e2ba8d9a44d92a24e5\"}},\"lastState\":{\"terminated\":{\"exitCode\":1,\"reason\":\"Error\",\"startedAt\":\"2020-03-19T18:12:36Z\",\"finishedAt\":\"2020-03-19T18:12:36Z\",\"containerID\":\"containerd://dc0bf77bc467ffd287ff6afbac571ea3f299d242bdf3c7bde9071cbd30b33c08\"}},\"ready\":false,\"restartCount\":3,\"image\":\"docker.io/library/busybox:1.31.1-uclibc\",\"imageID\":\"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51\",\"containerID\":\"containerd://702440f02a119413f98348e67417601436d05421736bf5e2ba8d9a44d92a24e5\"}],\"containerStatuses\":[{\"name\":\"sleep\",\"state\":{\"waiting\":{\"reason\":\"PodInitializing\"}},\"lastState\":{},\"ready\":false,\"restartCount\":0,\"image\":\"busybox:1.31.1-uclibc\",\"imageID\":\"\"}],\"qosClass\":\"BestEffort\"}",
                        namespace: "production",
                    },
                ],
            };
            const s: Sent[] = [];
            const l: string[] = [];
            const c = generateContext(d, s, l);
            const r = await handler(c);
            const em = "Init container fail (docker.io/library/busybox:1.31.1-uclibc) of pod production/init-fail in Kubernetes cluster k8s-internal-demo failed: `1`";
            const e = {
                code: 1,
                reason: em,
            };
            assert.deepStrictEqual(r, e);
            const es = [
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: "Pod production/init-fail in Kubernetes cluster k8s-internal-demo recovered",
                    options: {
                        id: "testing:k8s-internal-demo:production:init-fail",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
                {
                    message: em,
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    options: {
                        id: "testing:k8s-internal-demo:production:init-fail:init:fail",
                        ttl: 86400000,
                    },
                },
            ];
            assert.deepStrictEqual(s, es);
            const el = [em];
            assert.deepStrictEqual(l, el);
        });

        it("ignores init container failures below threshold", async () => {
            const d = {
                K8Pod: [
                    {
                        baseName: "init-fail",
                        name: "init-fail",
                        resourceVersion: 158171762,
                        phase: "Pending",
                        containers: [] as any[],
                        environment: "k8s-internal-demo",
                        timestamp: "2020-03-19T18:12:20Z",
                        statusJSON: "{\"phase\":\"Pending\",\"conditions\":[{\"type\":\"Initialized\",\"status\":\"False\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-19T18:12:20Z\",\"reason\":\"ContainersNotInitialized\",\"message\":\"containers with incomplete status: [fail]\"},{\"type\":\"Ready\",\"status\":\"False\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-19T18:12:20Z\",\"reason\":\"ContainersNotReady\",\"message\":\"containers with unready status: [sleep]\"},{\"type\":\"ContainersReady\",\"status\":\"False\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-19T18:12:20Z\",\"reason\":\"ContainersNotReady\",\"message\":\"containers with unready status: [sleep]\"},{\"type\":\"PodScheduled\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-19T18:12:20Z\"}],\"hostIP\":\"10.0.3.197\",\"podIP\":\"10.12.0.27\",\"startTime\":\"2020-03-19T18:12:20Z\",\"initContainerStatuses\":[{\"name\":\"fail\",\"state\":{\"terminated\":{\"exitCode\":1,\"reason\":\"Error\",\"startedAt\":\"2020-03-19T18:13:00Z\",\"finishedAt\":\"2020-03-19T18:13:00Z\",\"containerID\":\"containerd://702440f02a119413f98348e67417601436d05421736bf5e2ba8d9a44d92a24e5\"}},\"lastState\":{\"terminated\":{\"exitCode\":1,\"reason\":\"Error\",\"startedAt\":\"2020-03-19T18:12:36Z\",\"finishedAt\":\"2020-03-19T18:12:36Z\",\"containerID\":\"containerd://dc0bf77bc467ffd287ff6afbac571ea3f299d242bdf3c7bde9071cbd30b33c08\"}},\"ready\":false,\"restartCount\":2,\"image\":\"docker.io/library/busybox:1.31.1-uclibc\",\"imageID\":\"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51\",\"containerID\":\"containerd://702440f02a119413f98348e67417601436d05421736bf5e2ba8d9a44d92a24e5\"}],\"containerStatuses\":[{\"name\":\"sleep\",\"state\":{\"waiting\":{\"reason\":\"PodInitializing\"}},\"lastState\":{},\"ready\":false,\"restartCount\":0,\"image\":\"busybox:1.31.1-uclibc\",\"imageID\":\"\"}],\"qosClass\":\"BestEffort\"}",
                        namespace: "production",
                    },
                ],
            };
            const s: Sent[] = [];
            const l: string[] = [];
            const c = generateContext(d, s, l);
            const r = await handler(c);
            const e = {
                code: 0,
                reason: "All pods healthy",
                visibility: "hidden",
            };
            assert.deepStrictEqual(r, e);
            const es = [
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: "Pod production/init-fail in Kubernetes cluster k8s-internal-demo recovered",
                    options: {
                        id: "testing:k8s-internal-demo:production:init-fail",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: "Init container fail (docker.io/library/busybox:1.31.1-uclibc) of pod production/init-fail in Kubernetes cluster k8s-internal-demo recovered",
                    options: {
                        id: "testing:k8s-internal-demo:production:init-fail:init:fail",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: "Container sleep (busybox:1.31.1-uclibc) of pod production/init-fail in Kubernetes cluster k8s-internal-demo recovered",
                    options: {
                        id: "testing:k8s-internal-demo:production:init-fail:sleep",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
            ];
            assert.deepStrictEqual(s, es);
            const el: string[] = [];
            assert.deepStrictEqual(l, el);
        });

        it("detects exceeding maximum restarts", async () => {
            const d = {
                K8Pod: [
                    {
                        baseName: "restart",
                        name: "restart",
                        resourceVersion: 158217367,
                        phase: "Running",
                        containers: [
                            {
                                stateReason: "",
                                ready: true,
                                name: "sleep",
                                restartCount: 12,
                                resourceVersion: 158217367,
                                state: "running",
                                containerID: "containerd://7441f1838a5bbc3e318b6afdacfbd348e1ef18d53ef485e9a2abc4483a4665dd",
                                image: {
                                    commits: [] as any[],
                                },
                                environment: "k8s-internal-demo",
                                imageName: "busybox:1.31.1-uclibc",
                                timestamp: "2020-03-18T18:15:50.548Z",
                                statusJSON: "{\"name\":\"sleep\",\"state\":{\"running\":{\"startedAt\":\"2020-03-19T21:05:42Z\"}},\"lastState\":{\"terminated\":{\"exitCode\":0,\"reason\":\"Completed\",\"startedAt\":\"2020-03-19T20:59:49Z\",\"finishedAt\":\"2020-03-19T21:04:50Z\",\"containerID\":\"containerd://87cb7ca0fbbc0b05d7dca1ddc5629db5157d2946636c83be228a508d763883ba\"}},\"ready\":true,\"restartCount\":12,\"image\":\"docker.io/library/busybox:1.31.1-uclibc\",\"imageID\":\"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51\",\"containerID\":\"containerd://aa4f3cbe18dfa2f3a42de286f434d3d457fa93ca1317013f8a2387437dda684e\"}",
                            },
                        ],
                        environment: "k8s-internal-demo",
                        timestamp: "2020-03-19T20:43:49Z",
                        statusJSON: "{\"phase\":\"Running\",\"conditions\":[{\"type\":\"Initialized\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-19T20:44:01Z\"},{\"type\":\"Ready\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-19T21:05:42Z\"},{\"type\":\"ContainersReady\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-19T21:05:42Z\"},{\"type\":\"PodScheduled\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-03-19T20:43:49Z\"}],\"hostIP\":\"10.0.3.197\",\"podIP\":\"10.12.0.31\",\"startTime\":\"2020-03-19T20:43:49Z\",\"initContainerStatuses\":[{\"name\":\"success\",\"state\":{\"terminated\":{\"exitCode\":0,\"reason\":\"Completed\",\"startedAt\":\"2020-03-19T20:43:50Z\",\"finishedAt\":\"2020-03-19T20:44:00Z\",\"containerID\":\"containerd://3e43c95249a0020f56b53e365a02cb422e4c49fa419e13fb653e2adf67dc4cae\"}},\"lastState\":{},\"ready\":true,\"restartCount\":0,\"image\":\"docker.io/library/busybox:1.31.1-uclibc\",\"imageID\":\"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51\",\"containerID\":\"containerd://3e43c95249a0020f56b53e365a02cb422e4c49fa419e13fb653e2adf67dc4cae\"}],\"containerStatuses\":[{\"name\":\"sleep\",\"state\":{\"running\":{\"startedAt\":\"2020-03-19T21:05:42Z\"}},\"lastState\":{\"terminated\":{\"exitCode\":0,\"reason\":\"Completed\",\"startedAt\":\"2020-03-19T20:59:49Z\",\"finishedAt\":\"2020-03-19T21:04:50Z\",\"containerID\":\"containerd://87cb7ca0fbbc0b05d7dca1ddc5629db5157d2946636c83be228a508d763883ba\"}},\"ready\":true,\"restartCount\":12,\"image\":\"docker.io/library/busybox:1.31.1-uclibc\",\"imageID\":\"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51\",\"containerID\":\"containerd://aa4f3cbe18dfa2f3a42de286f434d3d457fa93ca1317013f8a2387437dda684e\"}],\"qosClass\":\"BestEffort\"}",
                        namespace: "production",
                    },
                ],
            };
            const s: Sent[] = [];
            const l: string[] = [];
            const c = generateContext(d, s, l);
            const r = await handler(c);
            const em = "Container sleep (docker.io/library/busybox:1.31.1-uclibc) of pod production/restart in Kubernetes cluster k8s-internal-demo has restarted too many times: `12 > 10`";
            const e = {
                code: 1,
                reason: em,
            };
            assert.deepStrictEqual(r, e);
            const es = [
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: "Pod production/restart in Kubernetes cluster k8s-internal-demo recovered",
                    options: {
                        id: "testing:k8s-internal-demo:production:restart",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: "Init container success (docker.io/library/busybox:1.31.1-uclibc) of pod production/restart in Kubernetes cluster k8s-internal-demo recovered",
                    options: {
                        id: "testing:k8s-internal-demo:production:restart:init:success",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
                {
                    message: em,
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    options: {
                        id: "testing:k8s-internal-demo:production:restart:sleep",
                        ttl: 86400000,
                    },
                },
            ];
            assert.deepStrictEqual(s, es);
            const el = [em];
            assert.deepStrictEqual(l, el);
        });

        it("ignores fewer than maximum restarts", async () => {
            const d = {
                K8Pod: [
                    {
                        baseName: "restart",
                        name: "restart",
                        resourceVersion: 158217367,
                        phase: "Running",
                        containers: [
                            {
                                stateReason: "",
                                ready: true,
                                name: "sleep",
                                restartCount: 3,
                                resourceVersion: 158217367,
                                state: "running",
                                containerID: "containerd://7441f1838a5bbc3e318b6afdacfbd348e1ef18d53ef485e9a2abc4483a4665dd",
                                image: {
                                    commits: [] as any[],
                                },
                                environment: "k8s-internal-demo",
                                imageName: "busybox:1.31.1-uclibc",
                                timestamp: "2020-01-18T18:15:50.548Z",
                                statusJSON: "{\"name\":\"sleep\",\"state\":{\"running\":{\"startedAt\":\"2020-01-19T21:05:42Z\"}},\"lastState\":{\"terminated\":{\"exitCode\":0,\"reason\":\"Completed\",\"startedAt\":\"2020-01-19T20:59:49Z\",\"finishedAt\":\"2020-01-19T21:04:50Z\",\"containerID\":\"containerd://87cb7ca0fbbc0b05d7dca1ddc5629db5157d2946636c83be228a508d763883ba\"}},\"ready\":true,\"restartCount\":3,\"image\":\"docker.io/library/busybox:1.31.1-uclibc\",\"imageID\":\"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51\",\"containerID\":\"containerd://aa4f3cbe18dfa2f3a42de286f434d3d457fa93ca1317013f8a2387437dda684e\"}",
                            },
                        ],
                        environment: "k8s-internal-demo",
                        timestamp: "2020-01-19T20:43:49Z",
                        statusJSON: "{\"phase\":\"Running\",\"conditions\":[{\"type\":\"Initialized\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-01-19T20:44:01Z\"},{\"type\":\"Ready\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-01-19T21:05:42Z\"},{\"type\":\"ContainersReady\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-01-19T21:05:42Z\"},{\"type\":\"PodScheduled\",\"status\":\"True\",\"lastProbeTime\":null,\"lastTransitionTime\":\"2020-01-19T20:43:49Z\"}],\"hostIP\":\"10.0.3.197\",\"podIP\":\"10.12.0.31\",\"startTime\":\"2020-01-19T20:43:49Z\",\"initContainerStatuses\":[{\"name\":\"success\",\"state\":{\"terminated\":{\"exitCode\":0,\"reason\":\"Completed\",\"startedAt\":\"2020-01-19T20:43:50Z\",\"finishedAt\":\"2020-01-19T20:44:00Z\",\"containerID\":\"containerd://3e43c95249a0020f56b53e365a02cb422e4c49fa419e13fb653e2adf67dc4cae\"}},\"lastState\":{},\"ready\":true,\"restartCount\":0,\"image\":\"docker.io/library/busybox:1.31.1-uclibc\",\"imageID\":\"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51\",\"containerID\":\"containerd://3e43c95249a0020f56b53e365a02cb422e4c49fa419e13fb653e2adf67dc4cae\"}],\"containerStatuses\":[{\"name\":\"sleep\",\"state\":{\"running\":{\"startedAt\":\"2020-01-19T21:05:42Z\"}},\"lastState\":{\"terminated\":{\"exitCode\":0,\"reason\":\"Completed\",\"startedAt\":\"2020-01-19T20:59:49Z\",\"finishedAt\":\"2020-01-19T21:04:50Z\",\"containerID\":\"containerd://87cb7ca0fbbc0b05d7dca1ddc5629db5157d2946636c83be228a508d763883ba\"}},\"ready\":true,\"restartCount\":3,\"image\":\"docker.io/library/busybox:1.31.1-uclibc\",\"imageID\":\"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51\",\"containerID\":\"containerd://aa4f3cbe18dfa2f3a42de286f434d3d457fa93ca1317013f8a2387437dda684e\"}],\"qosClass\":\"BestEffort\"}",
                        namespace: "production",
                    },
                ],
            };
            const s: Sent[] = [];
            const l: string[] = [];
            const c = generateContext(d, s, l);
            const r = await handler(c);
            const e = {
                code: 0,
                reason: "All pods healthy",
                visibility: "hidden",
            };
            assert.deepStrictEqual(r, e);
            const es = [
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: "Pod production/restart in Kubernetes cluster k8s-internal-demo recovered",
                    options: {
                        id: "testing:k8s-internal-demo:production:restart",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: "Init container success (docker.io/library/busybox:1.31.1-uclibc) of pod production/restart in Kubernetes cluster k8s-internal-demo recovered",
                    options: {
                        id: "testing:k8s-internal-demo:production:restart:init:success",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
                {
                    message: "Container sleep (docker.io/library/busybox:1.31.1-uclibc) of pod production/restart in Kubernetes cluster k8s-internal-demo recovered",
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    options: {
                        id: "testing:k8s-internal-demo:production:restart:sleep",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
            ];
            assert.deepStrictEqual(s, es);
            const el: string[] = [];
            assert.deepStrictEqual(l, el);
        });

        it("detects when pod is not ready", async () => {
            const age = ageString(new Date(new Date().getTime() - 24 * 60 * 60 * 1000));
            const d = {
                K8Pod: [
                    {
                        baseName: "unhealthy",
                        name: "unhealthy",
                        resourceVersion: 158465639,
                        phase: "Running",
                        containers: [
                            {
                                stateReason: "",
                                ready: false,
                                name: "unhealthy",
                                restartCount: 0,
                                resourceVersion: 158465639,
                                state: "running",
                                containerID: "containerd://13147fc42ce076fd9008c01b1b8db19c43e972997b3d3cdefc87f05196b967c6",
                                image: {
                                    commits: [] as any[],
                                },
                                environment: "k8s-internal-demo",
                                imageName: "busybox:1.31.1-uclibc",
                                timestamp: age,
                                statusJSON: `{"name":"unhealthy","state":{"running":{"startedAt":"${age}"}},"lastState":{},"ready":false,"restartCount":0,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://13147fc42ce076fd9008c01b1b8db19c43e972997b3d3cdefc87f05196b967c6"}`,
                            },
                            {
                                stateReason: "",
                                ready: true,
                                name: "sleep",
                                restartCount: 0,
                                resourceVersion: 158465818,
                                state: "running",
                                containerID: "containerd://7441f1838a5bbc3e318b6afdacfbd348e1ef18d53ef485e9a2abc4483a4665dd",
                                image: {
                                    commits: [],
                                },
                                environment: "k8s-internal-demo",
                                imageName: "busybox:1.31.1-uclibc",
                                timestamp: age,
                                statusJSON: `{"name":"sleep","state":{"running":{"startedAt":"${age}"}},"lastState":{"terminated":{"exitCode":0,"reason":"Completed","startedAt":"${age}","finishedAt":"${age}","containerID":"containerd://0c4c5d6812fa52baba78da7ee02327a524e27a3b7da5bf10d82bdd147fa7ef54"}},"ready":true,"restartCount":0,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://874b36ed449a9f34d8b012224ff240f0514202dae7480bcfccd02f5fc6457801"}`,
                            },
                        ],
                        environment: "k8s-internal-demo",
                        timestamp: "${age}",
                        statusJSON: `{"phase":"Running","conditions":[{"type":"Initialized","status":"True","lastProbeTime":null,"lastTransitionTime":"${age}"},{"type":"Ready","status":"False","lastProbeTime":null,"lastTransitionTime":"${age}","reason":"ContainersNotReady","message":"containers with unready status: [unhealthy]"},{"type":"ContainersReady","status":"False","lastProbeTime":null,"lastTransitionTime":"${age}","reason":"ContainersNotReady","message":"containers with unready status: [unhealthy]"},{"type":"PodScheduled","status":"True","lastProbeTime":null,"lastTransitionTime":"${age}"}],"hostIP":"10.0.3.197","podIP":"10.12.0.32","startTime":"${age}","containerStatuses":[{"name":"sleep","state":{"running":{"startedAt":"${age}"}},"lastState":{},"ready":true,"restartCount":0,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://fa231b33d61d0bc77cbf32b93bd57fea1f02a2de82fd4578f7ad1d17bb18c123"},{"name":"unhealthy","state":{"running":{"startedAt":"${age}"}},"lastState":{},"ready":false,"restartCount":0,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://13147fc42ce076fd9008c01b1b8db19c43e972997b3d3cdefc87f05196b967c6"}],"qosClass":"BestEffort"}`,
                        namespace: "production",
                    },
                ],
            };
            const s: Sent[] = [];
            const l: string[] = [];
            const c = generateContext(d, s, l);
            const r = await handler(c);
            const em = "Container unhealthy (docker.io/library/busybox:1.31.1-uclibc) of pod production/unhealthy in Kubernetes cluster k8s-internal-demo is not ready";
            const e = {
                code: 1,
                reason: em,
            };
            assert.deepStrictEqual(r, e);
            const es = [
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: "Pod production/unhealthy in Kubernetes cluster k8s-internal-demo recovered",
                    options: {
                        id: "testing:k8s-internal-demo:production:unhealthy",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: "Container sleep (docker.io/library/busybox:1.31.1-uclibc) of pod production/unhealthy in Kubernetes cluster k8s-internal-demo recovered",
                    options: {
                        id: "testing:k8s-internal-demo:production:unhealthy:sleep",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
                {
                    message: em,
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    options: {
                        id: "testing:k8s-internal-demo:production:unhealthy:unhealthy",
                        ttl: 86400000,
                    },
                },
            ];
            assert.deepStrictEqual(s, es);
            const el = [em];
            assert.deepStrictEqual(l, el);
        });

        it("ignores when young pod is not ready", async () => {
            const age = ageString(new Date(new Date().getTime() - 5 * 60 * 1000));
            const d = {
                K8Pod: [
                    {
                        baseName: "unhealthy",
                        name: "unhealthy",
                        resourceVersion: 158465639,
                        phase: "Running",
                        containers: [
                            {
                                stateReason: "",
                                ready: false,
                                name: "unhealthy",
                                restartCount: 0,
                                resourceVersion: 158465639,
                                state: "running",
                                containerID: "containerd://13147fc42ce076fd9008c01b1b8db19c43e972997b3d3cdefc87f05196b967c6",
                                image: {
                                    commits: [] as any[],
                                },
                                environment: "k8s-internal-demo",
                                imageName: "busybox:1.31.1-uclibc",
                                timestamp: age,
                                statusJSON: `{"name":"unhealthy","state":{"running":{"startedAt":"${age}"}},"lastState":{},"ready":false,"restartCount":0,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://13147fc42ce076fd9008c01b1b8db19c43e972997b3d3cdefc87f05196b967c6"}`,
                            },
                            {
                                stateReason: "",
                                ready: true,
                                name: "sleep",
                                restartCount: 0,
                                resourceVersion: 158465818,
                                state: "running",
                                containerID: "containerd://7441f1838a5bbc3e318b6afdacfbd348e1ef18d53ef485e9a2abc4483a4665dd",
                                image: {
                                    commits: [],
                                },
                                environment: "k8s-internal-demo",
                                imageName: "busybox:1.31.1-uclibc",
                                timestamp: age,
                                statusJSON: `{"name":"sleep","state":{"running":{"startedAt":"${age}"}},"lastState":{"terminated":{"exitCode":0,"reason":"Completed","startedAt":"${age}","finishedAt":"${age}","containerID":"containerd://0c4c5d6812fa52baba78da7ee02327a524e27a3b7da5bf10d82bdd147fa7ef54"}},"ready":true,"restartCount":0,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://874b36ed449a9f34d8b012224ff240f0514202dae7480bcfccd02f5fc6457801"}`,
                            },
                        ],
                        environment: "k8s-internal-demo",
                        timestamp: "${age}",
                        statusJSON: `{"phase":"Running","conditions":[{"type":"Initialized","status":"True","lastProbeTime":null,"lastTransitionTime":"${age}"},{"type":"Ready","status":"False","lastProbeTime":null,"lastTransitionTime":"${age}","reason":"ContainersNotReady","message":"containers with unready status: [unhealthy]"},{"type":"ContainersReady","status":"False","lastProbeTime":null,"lastTransitionTime":"${age}","reason":"ContainersNotReady","message":"containers with unready status: [unhealthy]"},{"type":"PodScheduled","status":"True","lastProbeTime":null,"lastTransitionTime":"${age}"}],"hostIP":"10.0.3.197","podIP":"10.12.0.32","startTime":"${age}","containerStatuses":[{"name":"sleep","state":{"running":{"startedAt":"${age}"}},"lastState":{},"ready":true,"restartCount":0,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://fa231b33d61d0bc77cbf32b93bd57fea1f02a2de82fd4578f7ad1d17bb18c123"},{"name":"unhealthy","state":{"running":{"startedAt":"${age}"}},"lastState":{},"ready":false,"restartCount":0,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://13147fc42ce076fd9008c01b1b8db19c43e972997b3d3cdefc87f05196b967c6"}],"qosClass":"BestEffort"}`,
                        namespace: "production",
                    },
                ],
            };
            const s: Sent[] = [];
            const l: string[] = [];
            const c = generateContext(d, s, l);
            const r = await handler(c);
            const e = {
                code: 0,
                reason: "All pods healthy",
                visibility: "hidden",
            };
            assert.deepStrictEqual(r, e);
            const es = [
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: "Pod production/unhealthy in Kubernetes cluster k8s-internal-demo recovered",
                    options: {
                        id: "testing:k8s-internal-demo:production:unhealthy",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: "Container sleep (docker.io/library/busybox:1.31.1-uclibc) of pod production/unhealthy in Kubernetes cluster k8s-internal-demo recovered",
                    options: {
                        id: "testing:k8s-internal-demo:production:unhealthy:sleep",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
                {
                    message: "Container unhealthy (docker.io/library/busybox:1.31.1-uclibc) of pod production/unhealthy in Kubernetes cluster k8s-internal-demo recovered",
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    options: {
                        id: "testing:k8s-internal-demo:production:unhealthy:unhealthy",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
            ];
            assert.deepStrictEqual(s, es);
            const el: string[] = [];
            assert.deepStrictEqual(l, el);
        });

        it("ignores a pod being replaced", async () => {
            const age = ageString(new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000));
            const d = {
                K8Pod: [
                    {
                        baseName: "dood-7d4b7588bd",
                        name: "dood-7d4b7588bd-vptds",
                        resourceVersion: 277272607,
                        phase: "Running",
                        containers: [
                            {
                                stateReason: "Error",
                                ready: false,
                                name: "dood",
                                restartCount: 0,
                                resourceVersion: 277272607,
                                state: "terminated",
                                containerID: "docker://48829a6b5b2d1ea2f3427a88c0303172a03849d249781a1ea2762515b32e3d98",
                                image: {
                                    commits: [
                                        {
                                            repo: {
                                                name: "dood",
                                                owner: "atomist",
                                            },
                                            sha: "82ced23dd5bb25fe4505536e28f5a1c692ecb814",
                                        },
                                    ],
                                },
                                environment: "k8s-internal-demo",
                                imageName: "atomist/dood:0.1.3-20200323102421",
                                timestamp: age,
                            },
                        ],
                        environment: "k8s-internal-demo",
                        timestamp: age,
                        statusJSON: `{"phase":"Running","conditions":[{"type":"Initialized","status":"True","lastProbeTime":null,"lastTransitionTime":"${age}"},{"type":"Ready","status":"False","lastProbeTime":null,"lastTransitionTime":"${age}","reason":"ContainersNotReady","message":"containers with unready status: [dood]"},{"type":"ContainersReady","status":"False","lastProbeTime":null,"lastTransitionTime":"${age}","reason":"ContainersNotReady","message":"containers with unready status: [dood]"},{"type":"PodScheduled","status":"True","lastProbeTime":null,"lastTransitionTime":"${age}"}],"hostIP":"10.121.36.46","podIP":"10.56.11.217","startTime":"${age}","containerStatuses":[{"name":"dood","state":{"terminated":{"exitCode":143,"reason":"Error","startedAt":"${age}","finishedAt":"${age}","containerID":"docker://6a2c75f5b101172812f7e90aecc92a4e3d75d91bda7bcac05d396abc4dca9184"}},"lastState":{},"ready":false,"restartCount":0,"image":"atomist/dood:0.1.3-20200323102421","imageID":"docker-pullable://docker.io/atomist/dood@sha256:36f2ddd2110904c70bb02d2350f482fc325aecd64dc672b4ed777f76fbd592ad","containerID":"docker://6a2c75f5b101172812f7e90aecc92a4e3d75d91bda7bcac05d396abc4dca9184"}],"qosClass":"Burstable"}`,
                        namespace: "api-production",
                    },
                ],
            };
            const s: Sent[] = [];
            const l: string[] = [];
            const c = generateContext(d, s, l);
            const r = await handler(c);
            const e = {
                code: 0,
                reason: "All pods healthy",
                visibility: "hidden",
            };
            assert.deepStrictEqual(r, e);
            const es = [
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: "Pod api-production/dood-7d4b7588bd-vptds in Kubernetes cluster k8s-internal-demo recovered",
                    options: {
                        id: "testing:k8s-internal-demo:api-production:dood-7d4b7588bd-vptds",
                        post: "update_only",
                        ttl: 86400000,
                    },
                },
                {
                    destination: { channels: ["devs", "prod-alerts"], users: [] as string[] },
                    message: "DELETE",
                    options: {
                        id: "testing:k8s-internal-demo:api-production:dood-7d4b7588bd-vptds:dood",
                    },
                },
            ];
            assert.deepStrictEqual(s, es);
            const el: string[] = [];
            assert.deepStrictEqual(l, el);
        });

    });

});
