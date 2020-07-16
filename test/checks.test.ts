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

import * as assert from "power-assert";
import {
	checkCluster,
	CheckClusterArgs,
	checkPodState,
	PodArgs,
} from "../lib/checks";
import { parsePodStatus } from "../lib/pod";
import { K8sPodStateSubscription } from "../lib/typings/types";

describe("checks", () => {
	describe("checkCluster", () => {
		function generateArgs(e: string): CheckClusterArgs {
			return ({
				clusterName: e,
				graphql: {
					query: async (f: string, o: { id: string }) => {
						assert(f === "kubernetesClusterProvider.graphql");
						if (o.id === "AW04K5PID_11111111-2222-aaaa-bbbb-999999999999") {
							return { KubernetesClusterProvider: [{ name: "staging" }] };
						} else if (
							o.id === "AW04K5PID_33333333-4444-cccc-dddd-888888888888"
						) {
							return { KubernetesClusterProvider: [{ name: "production" }] };
						} else {
							return { KubernetesClusterProvider: [] };
						}
					},
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
			} as unknown) as CheckClusterArgs;
		}

		it("matches the cluster", async () => {
			for (const e of ["production", "staging"]) {
				const a = generateArgs(e);
				assert(await checkCluster(a));
			}
		});

		it("does not match the cluster", async () => {
			for (const e of ["k8s-production", "staging-k8s", "testing"]) {
				const a = generateArgs(e);
				assert(!(await checkCluster(a)));
			}
		});
	});

	describe("checkPodState", () => {
		function generatePodArgs(
			pod: K8sPodStateSubscription["K8Pod"][0],
		): PodArgs {
			const status = parsePodStatus(pod);
			return {
				now: 1584649389876, // 2020-03-19T20:23:09.876Z
				parameters: {
					crashLoopBackOff: true,
					createContainerConfigError: true,
					imagePullBackOff: true,
					maxRestarts: 10,
					notCreatedSeconds: 600,
					notReadyDelaySeconds: 600,
					notScheduledDelaySeconds: 600,
					oomKilled: true,
					namespaceIncludeRegExp: "production|staging",
					namespaceExcludeRegExp: "^kube-",
				},
				pod,
				status,
			};
		}

		it("concludes everything is okay", () => {
			const p = {
				baseName: "init",
				name: "init-sleep",
				resourceVersion: 158190338,
				phase: "Running",
				clusterName: "k8s-internal-demo",
				timestamp: "2020-03-19T19:23:09Z",
				statusJSON:
					'{"phase":"Running","conditions":[{"type":"Initialized","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-19T19:23:21Z"},{"type":"Ready","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-19T19:23:22Z"},{"type":"ContainersReady","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-19T19:23:22Z"},{"type":"PodScheduled","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-19T19:23:09Z"}],"hostIP":"10.0.3.197","podIP":"10.12.0.29","startTime":"2020-03-19T19:23:09Z","initContainerStatuses":[{"name":"success","state":{"terminated":{"exitCode":0,"reason":"Completed","startedAt":"2020-03-19T19:23:10Z","finishedAt":"2020-03-19T19:23:20Z","containerID":"containerd://701bc329ef85396fa59e94c5cead8cbbe5210f086619c90dce7b1f3bd02aaf1e"}},"lastState":{},"ready":true,"restartCount":0,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://701bc329ef85396fa59e94c5cead8cbbe5210f086619c90dce7b1f3bd02aaf1e"}],"containerStatuses":[{"name":"sleep","state":{"running":{"startedAt":"2020-03-19T19:23:21Z"}},"lastState":{},"ready":true,"restartCount":0,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://a35f0076125fc74de40e1716236aee1c15e6ca54d71620cdc993ddea5cb195cd"}],"qosClass":"BestEffort"}',
				namespace: "production",
			};
			const pa = generatePodArgs(p);
			const pc = checkPodState(pa);
			const e = [
				{
					id: "k8s-internal-demo:production:init-sleep",
					slug:
						"pod production/init-sleep in Kubernetes cluster k8s-internal-demo",
				},
				{
					id: "k8s-internal-demo:production:init-sleep:init:success",
					slug:
						"init container success (docker.io/library/busybox:1.31.1-uclibc) of pod production/init-sleep in Kubernetes cluster k8s-internal-demo",
				},
				{
					id: "k8s-internal-demo:production:init-sleep:sleep",
					slug:
						"container sleep (docker.io/library/busybox:1.31.1-uclibc) of pod production/init-sleep in Kubernetes cluster k8s-internal-demo",
				},
			];
			assert.deepStrictEqual(pc, e);
		});

		it("ignores problems in excluded namespaces", () => {
			const p = {
				baseName: "crash-loop",
				name: "crash-loop",
				resourceVersion: 157792924,
				phase: "Running",
				clusterName: "k8s-internal-demo",
				timestamp: "2020-03-18T18:15:48Z",
				statusJSON:
					'{"phase":"Running","conditions":[{"type":"Initialized","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-18T18:15:48Z"},{"type":"Ready","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-18T18:16:33Z","reason":"ContainersNotReady","message":"containers with unready status: [sleep]"},{"type":"ContainersReady","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-18T18:16:33Z","reason":"ContainersNotReady","message":"containers with unready status: [sleep]"},{"type":"PodScheduled","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-18T18:15:48Z"}],"hostIP":"10.0.3.197","podIP":"10.12.0.24","startTime":"2020-03-18T18:15:48Z","containerStatuses":[{"name":"sleep","state":{"waiting":{"reason":"CrashLoopBackOff","message":"Back-off 20s restarting failed container=sleep pod=crash-loop_production(a689804f-5628-4377-916d-c7889a5539cb)"}},"lastState":{"terminated":{"exitCode":0,"reason":"Completed","startedAt":"2020-03-18T18:16:23Z","finishedAt":"2020-03-18T18:16:33Z","containerID":"containerd://b5b301bf493cca046a9b1598b3769a6215f89ac119837db06b1f12a63401dd81"}},"ready":false,"restartCount":2,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://b5b301bf493cca046a9b1598b3769a6215f89ac119837db06b1f12a63401dd81"}],"qosClass":"BestEffort"}',
				namespace: "kube-something",
			};
			const pa = generatePodArgs(p);
			const pc = checkPodState(pa);
			assert.deepStrictEqual(pc, []);
		});

		it("ignores problems in not included namespaces", () => {
			const p = {
				baseName: "crash-loop",
				name: "crash-loop",
				resourceVersion: 157792924,
				phase: "Running",
				clusterName: "k8s-internal-demo",
				timestamp: "2020-03-18T18:15:48Z",
				statusJSON:
					'{"phase":"Running","conditions":[{"type":"Initialized","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-18T18:15:48Z"},{"type":"Ready","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-18T18:16:33Z","reason":"ContainersNotReady","message":"containers with unready status: [sleep]"},{"type":"ContainersReady","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-18T18:16:33Z","reason":"ContainersNotReady","message":"containers with unready status: [sleep]"},{"type":"PodScheduled","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-18T18:15:48Z"}],"hostIP":"10.0.3.197","podIP":"10.12.0.24","startTime":"2020-03-18T18:15:48Z","containerStatuses":[{"name":"sleep","state":{"waiting":{"reason":"CrashLoopBackOff","message":"Back-off 20s restarting failed container=sleep pod=crash-loop_production(a689804f-5628-4377-916d-c7889a5539cb)"}},"lastState":{"terminated":{"exitCode":0,"reason":"Completed","startedAt":"2020-03-18T18:16:23Z","finishedAt":"2020-03-18T18:16:33Z","containerID":"containerd://b5b301bf493cca046a9b1598b3769a6215f89ac119837db06b1f12a63401dd81"}},"ready":false,"restartCount":2,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://b5b301bf493cca046a9b1598b3769a6215f89ac119837db06b1f12a63401dd81"}],"qosClass":"BestEffort"}',
				namespace: "staggering",
			};
			const pa = generatePodArgs(p);
			const pc = checkPodState(pa);
			assert.deepStrictEqual(pc, []);
		});

		it("detects when pod is not scheduled", () => {
			const p = {
				baseName: "no-schedule",
				name: "no-schedule",
				resourceVersion: 158483664,
				phase: "Pending",
				clusterName: "k8s-internal-demo",
				timestamp: "2020-03-19T19:23:09Z",
				statusJSON: `{"phase":"Pending","conditions":[{"type":"PodScheduled","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-20T13:54:01Z","reason":"Unschedulable","message":"0/1 nodes are available: 1 Insufficient cpu, 1 Insufficient memory."}],"qosClass":"Burstable"}`,
				namespace: "production",
			};
			const pa = generatePodArgs(p);
			const pc = checkPodState(pa);
			const e = [
				{
					error:
						"Pod production/no-schedule in Kubernetes cluster k8s-internal-demo has not been scheduled: `0/1 nodes are available: 1 Insufficient cpu, 1 Insufficient memory.`",
					id: "k8s-internal-demo:production:no-schedule",
					slug:
						"pod production/no-schedule in Kubernetes cluster k8s-internal-demo",
				},
			];
			assert.deepStrictEqual(pc, e);
		});

		it("ignores when young pod is not scheduled", () => {
			const p = {
				baseName: "no-schedule",
				name: "no-schedule",
				resourceVersion: 158483664,
				phase: "Pending",
				clusterName: "k8s-internal-demo",
				timestamp: "2020-03-19T20:18:09Z",
				statusJSON: `{"phase":"Pending","conditions":[{"type":"PodScheduled","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-20T13:54:01Z","reason":"Unschedulable","message":"0/1 nodes are available: 1 Insufficient cpu, 1 Insufficient memory."}],"qosClass":"Burstable"}`,
				namespace: "production",
			};
			const pa = generatePodArgs(p);
			const pc = checkPodState(pa);
			const e = [
				{
					id: "k8s-internal-demo:production:no-schedule",
					slug:
						"pod production/no-schedule in Kubernetes cluster k8s-internal-demo",
				},
			];
			assert.deepStrictEqual(pc, e);
		});

		it("detects crash loop backoff", () => {
			const p = {
				baseName: "crash-loop",
				name: "crash-loop",
				resourceVersion: 157792924,
				phase: "Running",
				clusterName: "k8s-internal-demo",
				timestamp: "2020-03-18T18:15:48Z",
				statusJSON:
					'{"phase":"Running","conditions":[{"type":"Initialized","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-18T18:15:48Z"},{"type":"Ready","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-18T18:16:33Z","reason":"ContainersNotReady","message":"containers with unready status: [sleep]"},{"type":"ContainersReady","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-18T18:16:33Z","reason":"ContainersNotReady","message":"containers with unready status: [sleep]"},{"type":"PodScheduled","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-18T18:15:48Z"}],"hostIP":"10.0.3.197","podIP":"10.12.0.24","startTime":"2020-03-18T18:15:48Z","containerStatuses":[{"name":"sleep","state":{"waiting":{"reason":"CrashLoopBackOff","message":"Back-off 20s restarting failed container=sleep pod=crash-loop_production(a689804f-5628-4377-916d-c7889a5539cb)"}},"lastState":{"terminated":{"exitCode":0,"reason":"Completed","startedAt":"2020-03-18T18:16:23Z","finishedAt":"2020-03-18T18:16:33Z","containerID":"containerd://b5b301bf493cca046a9b1598b3769a6215f89ac119837db06b1f12a63401dd81"}},"ready":false,"restartCount":2,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://b5b301bf493cca046a9b1598b3769a6215f89ac119837db06b1f12a63401dd81"}],"qosClass":"BestEffort"}',
				namespace: "production",
			};
			const pa = generatePodArgs(p);
			const pc = checkPodState(pa);
			const e = [
				{
					id: "k8s-internal-demo:production:crash-loop",
					slug:
						"pod production/crash-loop in Kubernetes cluster k8s-internal-demo",
				},
				{
					error:
						"Container sleep (docker.io/library/busybox:1.31.1-uclibc) of pod production/crash-loop in Kubernetes cluster k8s-internal-demo is in CrashLoopBackOff: `Back-off 20s restarting failed container=sleep pod=crash-loop_production(a689804f-5628-4377-916d-c7889a5539cb)`",
					id: "k8s-internal-demo:production:crash-loop:sleep",
					slug:
						"container sleep (docker.io/library/busybox:1.31.1-uclibc) of pod production/crash-loop in Kubernetes cluster k8s-internal-demo",
				},
			];
			assert.deepStrictEqual(pc, e);
		});

		it("detects image pull backoff", () => {
			const p = {
				baseName: "image-pull-backoff",
				name: "image-pull-backoff",
				resourceVersion: 158112300,
				phase: "Pending",
				clusterName: "k8s-internal-demo",
				timestamp: "2020-03-19T14:27:41Z",
				statusJSON:
					'{"phase":"Pending","conditions":[{"type":"Initialized","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-19T14:27:41Z"},{"type":"Ready","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-19T14:27:41Z","reason":"ContainersNotReady","message":"containers with unready status: [nothing]"},{"type":"ContainersReady","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-19T14:27:41Z","reason":"ContainersNotReady","message":"containers with unready status: [nothing]"},{"type":"PodScheduled","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-19T14:27:41Z"}],"hostIP":"10.0.3.197","podIP":"10.12.0.26","startTime":"2020-03-19T14:27:41Z","containerStatuses":[{"name":"nothing","state":{"waiting":{"reason":"ImagePullBackOff","message":"Back-off pulling image \\"notanimage/thatexistsanywhere:badtag\\""}},"lastState":{},"ready":false,"restartCount":0,"image":"notanimage/thatexistsanywhere:badtag","imageID":""}],"qosClass":"BestEffort"}',
				namespace: "production",
			};
			const pa = generatePodArgs(p);
			const pc = checkPodState(pa);
			const e = [
				{
					id: "k8s-internal-demo:production:image-pull-backoff",
					slug:
						"pod production/image-pull-backoff in Kubernetes cluster k8s-internal-demo",
				},
				{
					error:
						'Container nothing (notanimage/thatexistsanywhere:badtag) of pod production/image-pull-backoff in Kubernetes cluster k8s-internal-demo is in ImagePullBackOff: `Back-off pulling image "notanimage/thatexistsanywhere:badtag"`',
					id: "k8s-internal-demo:production:image-pull-backoff:nothing",
					slug:
						"container nothing (notanimage/thatexistsanywhere:badtag) of pod production/image-pull-backoff in Kubernetes cluster k8s-internal-demo",
				},
			];
			assert.deepStrictEqual(pc, e);
		});

		it("detects OOMKilled", () => {
			const p = {
				baseName: "oom-kill",
				name: "oom-kill",
				resourceVersion: 158112300,
				phase: "Failed",
				clusterName: "k8s-internal-demo",
				timestamp: "2020-03-19T14:27:41Z",
				statusJSON: `{"conditions":[{"lastProbeTime":null,"lastTransitionTime":"2020-04-24T20:46:48Z","status":"True","type":"Initialized"},{"lastProbeTime":null,"lastTransitionTime":"2020-04-24T20:50:21Z","message":"containers with unready status: [kaniko]","reason":"ContainersNotReady","status":"False","type":"Ready"},{"lastProbeTime":null,"lastTransitionTime":"2020-04-24T20:50:21Z","message":"containers with unready status: [kaniko]","reason":"ContainersNotReady","status":"False","type":"ContainersReady"},{"lastProbeTime":null,"lastTransitionTime":"2020-04-24T20:46:44Z","status":"True","type":"PodScheduled"}],"containerStatuses":[{"containerID":"containerd://9987c0f9acdd7c416e4b9d937cfafa2616c188f2ed1fb2f10bd1525f10778c7e","image":"gcr.io/kaniko-project/executor:v0.19.0","imageID":"gcr.io/kaniko-project/executor@sha256:66be3f60f22b571faa82e0aaeb94731217ba0c58ac4a3b062bc84c6d8d545213","lastState":{},"name":"kaniko","ready":false,"restartCount":0,"state":{"terminated":{"containerID":"containerd://9987c0f9acdd7c416e4b9d937cfafa2616c188f2ed1fb2f10bd1525f10778c7e","exitCode":1,"finishedAt":"2020-04-24T20:50:21Z","reason":"OOMKilled","startedAt":"2020-04-24T20:46:48Z"}}}],"hostIP":"10.0.0.34","initContainerStatuses":[],"phase":"Failed","podIP":"10.60.4.62","qosClass":"Burstable","startTime":"2020-04-24T20:46:44Z"}`,
				namespace: "production",
			};
			const pa = generatePodArgs(p);
			const pc = checkPodState(pa);
			const e = [
				{
					id: "k8s-internal-demo:production:oom-kill",
					slug:
						"pod production/oom-kill in Kubernetes cluster k8s-internal-demo",
				},
				{
					error:
						"Container kaniko (gcr.io/kaniko-project/executor:v0.19.0) of pod production/oom-kill in Kubernetes cluster k8s-internal-demo has been OOMKilled: `1`",
					id: "k8s-internal-demo:production:oom-kill:kaniko",
					slug:
						"container kaniko (gcr.io/kaniko-project/executor:v0.19.0) of pod production/oom-kill in Kubernetes cluster k8s-internal-demo",
				},
			];
			assert.deepStrictEqual(pc, e);
		});

		it("detects init container failure", () => {
			const p = {
				baseName: "init-fail",
				name: "init-fail",
				resourceVersion: 158171762,
				phase: "Pending",
				clusterName: "k8s-internal-demo",
				timestamp: "2020-03-19T18:12:20Z",
				statusJSON:
					'{"phase":"Pending","conditions":[{"type":"Initialized","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-19T18:12:20Z","reason":"ContainersNotInitialized","message":"containers with incomplete status: [fail]"},{"type":"Ready","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-19T18:12:20Z","reason":"ContainersNotReady","message":"containers with unready status: [sleep]"},{"type":"ContainersReady","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-19T18:12:20Z","reason":"ContainersNotReady","message":"containers with unready status: [sleep]"},{"type":"PodScheduled","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-19T18:12:20Z"}],"hostIP":"10.0.3.197","podIP":"10.12.0.27","startTime":"2020-03-19T18:12:20Z","initContainerStatuses":[{"name":"fail","state":{"terminated":{"exitCode":1,"reason":"Error","startedAt":"2020-03-19T18:13:00Z","finishedAt":"2020-03-19T18:13:00Z","containerID":"containerd://702440f02a119413f98348e67417601436d05421736bf5e2ba8d9a44d92a24e5"}},"lastState":{"terminated":{"exitCode":1,"reason":"Error","startedAt":"2020-03-19T18:12:36Z","finishedAt":"2020-03-19T18:12:36Z","containerID":"containerd://dc0bf77bc467ffd287ff6afbac571ea3f299d242bdf3c7bde9071cbd30b33c08"}},"ready":false,"restartCount":13,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://702440f02a119413f98348e67417601436d05421736bf5e2ba8d9a44d92a24e5"}],"containerStatuses":[{"name":"sleep","state":{"waiting":{"reason":"PodInitializing"}},"lastState":{},"ready":false,"restartCount":0,"image":"busybox:1.31.1-uclibc","imageID":""}],"qosClass":"BestEffort"}',
				namespace: "production",
			};
			const pa = generatePodArgs(p);
			const pc = checkPodState(pa);
			const e = [
				{
					id: "k8s-internal-demo:production:init-fail",
					slug:
						"pod production/init-fail in Kubernetes cluster k8s-internal-demo",
				},
				{
					error:
						"Init container fail (docker.io/library/busybox:1.31.1-uclibc) of pod production/init-fail in Kubernetes cluster k8s-internal-demo has restarted too many times: `13 > 10`",
					id: "k8s-internal-demo:production:init-fail:init:fail",
					slug:
						"init container fail (docker.io/library/busybox:1.31.1-uclibc) of pod production/init-fail in Kubernetes cluster k8s-internal-demo",
				},
			];
			assert.deepStrictEqual(pc, e);
		});

		it("ignores init container failures below threshold", () => {
			const p = {
				baseName: "init-fail",
				name: "init-fail",
				resourceVersion: 158171762,
				phase: "Pending",
				clusterName: "k8s-internal-demo",
				timestamp: "2020-03-19T18:12:20Z",
				statusJSON:
					'{"phase":"Pending","conditions":[{"type":"Initialized","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-19T18:12:20Z","reason":"ContainersNotInitialized","message":"containers with incomplete status: [fail]"},{"type":"Ready","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-19T18:12:20Z","reason":"ContainersNotReady","message":"containers with unready status: [sleep]"},{"type":"ContainersReady","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-19T18:12:20Z","reason":"ContainersNotReady","message":"containers with unready status: [sleep]"},{"type":"PodScheduled","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-19T18:12:20Z"}],"hostIP":"10.0.3.197","podIP":"10.12.0.27","startTime":"2020-03-19T18:12:20Z","initContainerStatuses":[{"name":"fail","state":{"terminated":{"exitCode":1,"reason":"Error","startedAt":"2020-03-19T18:13:00Z","finishedAt":"2020-03-19T18:13:00Z","containerID":"containerd://702440f02a119413f98348e67417601436d05421736bf5e2ba8d9a44d92a24e5"}},"lastState":{"terminated":{"exitCode":1,"reason":"Error","startedAt":"2020-03-19T18:12:36Z","finishedAt":"2020-03-19T18:12:36Z","containerID":"containerd://dc0bf77bc467ffd287ff6afbac571ea3f299d242bdf3c7bde9071cbd30b33c08"}},"ready":false,"restartCount":2,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://702440f02a119413f98348e67417601436d05421736bf5e2ba8d9a44d92a24e5"}],"containerStatuses":[{"name":"sleep","state":{"waiting":{"reason":"PodInitializing"}},"lastState":{},"ready":false,"restartCount":0,"image":"busybox:1.31.1-uclibc","imageID":""}],"qosClass":"BestEffort"}',
				namespace: "production",
			};
			const pa = generatePodArgs(p);
			const pc = checkPodState(pa);
			const e = [
				{
					id: "k8s-internal-demo:production:init-fail",
					slug:
						"pod production/init-fail in Kubernetes cluster k8s-internal-demo",
				},
				{
					id: "k8s-internal-demo:production:init-fail:init:fail",
					slug:
						"init container fail (docker.io/library/busybox:1.31.1-uclibc) of pod production/init-fail in Kubernetes cluster k8s-internal-demo",
				},
				{
					id: "k8s-internal-demo:production:init-fail:sleep",
					slug:
						"container sleep (busybox:1.31.1-uclibc) of pod production/init-fail in Kubernetes cluster k8s-internal-demo",
				},
			];
			assert.deepStrictEqual(pc, e);
		});

		it("detects exceeding maximum restarts", () => {
			const p = {
				baseName: "restart",
				name: "restart",
				resourceVersion: 158217367,
				phase: "Running",
				clusterName: "k8s-internal-demo",
				timestamp: "2020-03-19T20:43:49Z",
				statusJSON:
					'{"phase":"Running","conditions":[{"type":"Initialized","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-19T20:44:01Z"},{"type":"Ready","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-19T21:05:42Z"},{"type":"ContainersReady","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-19T21:05:42Z"},{"type":"PodScheduled","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-19T20:43:49Z"}],"hostIP":"10.0.3.197","podIP":"10.12.0.31","startTime":"2020-03-19T20:43:49Z","initContainerStatuses":[{"name":"success","state":{"terminated":{"exitCode":0,"reason":"Completed","startedAt":"2020-03-19T20:43:50Z","finishedAt":"2020-03-19T20:44:00Z","containerID":"containerd://3e43c95249a0020f56b53e365a02cb422e4c49fa419e13fb653e2adf67dc4cae"}},"lastState":{},"ready":true,"restartCount":0,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://3e43c95249a0020f56b53e365a02cb422e4c49fa419e13fb653e2adf67dc4cae"}],"containerStatuses":[{"name":"sleep","state":{"running":{"startedAt":"2020-03-19T21:05:42Z"}},"lastState":{"terminated":{"exitCode":0,"reason":"Completed","startedAt":"2020-03-19T20:59:49Z","finishedAt":"2020-03-19T21:04:50Z","containerID":"containerd://87cb7ca0fbbc0b05d7dca1ddc5629db5157d2946636c83be228a508d763883ba"}},"ready":true,"restartCount":12,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://aa4f3cbe18dfa2f3a42de286f434d3d457fa93ca1317013f8a2387437dda684e"}],"qosClass":"BestEffort"}',
				namespace: "production",
			};
			const pa = generatePodArgs(p);
			const pc = checkPodState(pa);
			const e = [
				{
					slug:
						"pod production/restart in Kubernetes cluster k8s-internal-demo",
					id: "k8s-internal-demo:production:restart",
				},
				{
					slug:
						"init container success (docker.io/library/busybox:1.31.1-uclibc) of pod production/restart in Kubernetes cluster k8s-internal-demo",
					id: "k8s-internal-demo:production:restart:init:success",
				},
				{
					error:
						"Container sleep (docker.io/library/busybox:1.31.1-uclibc) of pod production/restart in Kubernetes cluster k8s-internal-demo has restarted too many times: `12 > 10`",
					id: "k8s-internal-demo:production:restart:sleep",
					slug:
						"container sleep (docker.io/library/busybox:1.31.1-uclibc) of pod production/restart in Kubernetes cluster k8s-internal-demo",
				},
			];
			assert.deepStrictEqual(pc, e);
		});

		it("ignores fewer than maximum restarts", () => {
			const p = {
				baseName: "restart",
				name: "restart",
				resourceVersion: 158217367,
				phase: "Running",
				clusterName: "k8s-internal-demo",
				timestamp: "2020-01-19T20:43:49Z",
				statusJSON:
					'{"phase":"Running","conditions":[{"type":"Initialized","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-01-19T20:44:01Z"},{"type":"Ready","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-01-19T21:05:42Z"},{"type":"ContainersReady","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-01-19T21:05:42Z"},{"type":"PodScheduled","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-01-19T20:43:49Z"}],"hostIP":"10.0.3.197","podIP":"10.12.0.31","startTime":"2020-01-19T20:43:49Z","initContainerStatuses":[{"name":"success","state":{"terminated":{"exitCode":0,"reason":"Completed","startedAt":"2020-01-19T20:43:50Z","finishedAt":"2020-01-19T20:44:00Z","containerID":"containerd://3e43c95249a0020f56b53e365a02cb422e4c49fa419e13fb653e2adf67dc4cae"}},"lastState":{},"ready":true,"restartCount":0,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://3e43c95249a0020f56b53e365a02cb422e4c49fa419e13fb653e2adf67dc4cae"}],"containerStatuses":[{"name":"sleep","state":{"running":{"startedAt":"2020-01-19T21:05:42Z"}},"lastState":{"terminated":{"exitCode":0,"reason":"Completed","startedAt":"2020-01-19T20:59:49Z","finishedAt":"2020-01-19T21:04:50Z","containerID":"containerd://87cb7ca0fbbc0b05d7dca1ddc5629db5157d2946636c83be228a508d763883ba"}},"ready":true,"restartCount":3,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://aa4f3cbe18dfa2f3a42de286f434d3d457fa93ca1317013f8a2387437dda684e"}],"qosClass":"BestEffort"}',
				namespace: "production",
			};
			const pa = generatePodArgs(p);
			const pc = checkPodState(pa);
			const e = [
				{
					id: "k8s-internal-demo:production:restart",
					slug:
						"pod production/restart in Kubernetes cluster k8s-internal-demo",
				},
				{
					id: "k8s-internal-demo:production:restart:init:success",
					slug:
						"init container success (docker.io/library/busybox:1.31.1-uclibc) of pod production/restart in Kubernetes cluster k8s-internal-demo",
				},
				{
					id: "k8s-internal-demo:production:restart:sleep",
					slug:
						"container sleep (docker.io/library/busybox:1.31.1-uclibc) of pod production/restart in Kubernetes cluster k8s-internal-demo",
				},
			];
			assert.deepStrictEqual(pc, e);
		});

		it("detects when pod is not ready", () => {
			const p = {
				baseName: "unhealthy",
				name: "unhealthy",
				resourceVersion: 158465639,
				phase: "Running",
				clusterName: "k8s-internal-demo",
				timestamp: "2020-03-19T20:10:09Z",
				statusJSON: `{"phase":"Running","conditions":[{"type":"Initialized","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-19T20:10:09Z"},{"type":"Ready","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-19T20:10:09Z","reason":"ContainersNotReady","message":"containers with unready status: [unhealthy]"},{"type":"ContainersReady","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-19T20:10:09Z","reason":"ContainersNotReady","message":"containers with unready status: [unhealthy]"},{"type":"PodScheduled","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-19T20:10:09Z"}],"hostIP":"10.0.3.197","podIP":"10.12.0.32","startTime":"2020-03-19T20:10:09Z","containerStatuses":[{"name":"sleep","state":{"running":{"startedAt":"2020-03-19T20:10:09Z"}},"lastState":{},"ready":true,"restartCount":0,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://fa231b33d61d0bc77cbf32b93bd57fea1f02a2de82fd4578f7ad1d17bb18c123"},{"name":"unhealthy","state":{"running":{"startedAt":"2020-03-19T20:10:09Z"}},"lastState":{},"ready":false,"restartCount":0,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://13147fc42ce076fd9008c01b1b8db19c43e972997b3d3cdefc87f05196b967c6"}],"qosClass":"BestEffort"}`,
				namespace: "production",
			};
			const pa = generatePodArgs(p);
			const pc = checkPodState(pa);
			const e = [
				{
					id: "k8s-internal-demo:production:unhealthy",
					slug:
						"pod production/unhealthy in Kubernetes cluster k8s-internal-demo",
				},
				{
					id: "k8s-internal-demo:production:unhealthy:sleep",
					slug:
						"container sleep (docker.io/library/busybox:1.31.1-uclibc) of pod production/unhealthy in Kubernetes cluster k8s-internal-demo",
				},
				{
					error:
						"Container unhealthy (docker.io/library/busybox:1.31.1-uclibc) of pod production/unhealthy in Kubernetes cluster k8s-internal-demo is not ready",
					id: "k8s-internal-demo:production:unhealthy:unhealthy",
					slug:
						"container unhealthy (docker.io/library/busybox:1.31.1-uclibc) of pod production/unhealthy in Kubernetes cluster k8s-internal-demo",
				},
			];
			assert.deepStrictEqual(pc, e);
		});

		it("ignores when young pod is not ready", () => {
			const p = {
				baseName: "unhealthy",
				name: "unhealthy",
				resourceVersion: 158465639,
				phase: "Running",
				clusterName: "k8s-internal-demo",
				timestamp: "2020-03-19T20:18:09Z",
				statusJSON: `{"phase":"Running","conditions":[{"type":"Initialized","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-19T20:18:09Z"},{"type":"Ready","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-19T20:18:09Z","reason":"ContainersNotReady","message":"containers with unready status: [unhealthy]"},{"type":"ContainersReady","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-19T20:18:09Z","reason":"ContainersNotReady","message":"containers with unready status: [unhealthy]"},{"type":"PodScheduled","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-19T20:18:09Z"}],"hostIP":"10.0.3.197","podIP":"10.12.0.32","startTime":"2020-03-19T20:18:09Z","containerStatuses":[{"name":"sleep","state":{"running":{"startedAt":"2020-03-19T20:18:09Z"}},"lastState":{},"ready":true,"restartCount":0,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://fa231b33d61d0bc77cbf32b93bd57fea1f02a2de82fd4578f7ad1d17bb18c123"},{"name":"unhealthy","state":{"running":{"startedAt":"2020-03-19T20:18:09Z"}},"lastState":{},"ready":false,"restartCount":0,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://13147fc42ce076fd9008c01b1b8db19c43e972997b3d3cdefc87f05196b967c6"}],"qosClass":"BestEffort"}`,
				namespace: "production",
			};
			const pa = generatePodArgs(p);
			const pc = checkPodState(pa);
			const e = [
				{
					id: "k8s-internal-demo:production:unhealthy",
					slug:
						"pod production/unhealthy in Kubernetes cluster k8s-internal-demo",
				},
				{
					id: "k8s-internal-demo:production:unhealthy:sleep",
					slug:
						"container sleep (docker.io/library/busybox:1.31.1-uclibc) of pod production/unhealthy in Kubernetes cluster k8s-internal-demo",
				},
				{
					id: "k8s-internal-demo:production:unhealthy:unhealthy",
					slug:
						"container unhealthy (docker.io/library/busybox:1.31.1-uclibc) of pod production/unhealthy in Kubernetes cluster k8s-internal-demo",
				},
			];
			assert.deepStrictEqual(pc, e);
		});

		it("ignores a pod being replaced", () => {
			const p = {
				baseName: "dood-7d4b7588bd",
				name: "dood-7d4b7588bd-vptds",
				resourceVersion: 277272607,
				phase: "Running",
				clusterName: "k8s-internal-production",
				timestamp: "2020-03-15T20:23:09Z",
				statusJSON: `{"phase":"Running","conditions":[{"type":"Initialized","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-15T20:23:09Z"},{"type":"Ready","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-15T20:23:09Z","reason":"ContainersNotReady","message":"containers with unready status: [dood]"},{"type":"ContainersReady","status":"False","lastProbeTime":null,"lastTransitionTime":"2020-03-15T20:23:09Z","reason":"ContainersNotReady","message":"containers with unready status: [dood]"},{"type":"PodScheduled","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-15T20:23:09Z"}],"hostIP":"10.121.36.46","podIP":"10.56.11.217","startTime":"2020-03-15T20:23:09Z","containerStatuses":[{"name":"dood","state":{"terminated":{"exitCode":143,"reason":"Error","startedAt":"2020-03-15T20:23:09Z","finishedAt":"2020-03-15T20:23:09Z","containerID":"docker://6a2c75f5b101172812f7e90aecc92a4e3d75d91bda7bcac05d396abc4dca9184"}},"lastState":{},"ready":false,"restartCount":0,"image":"atomist/dood:0.1.3-20200323102421","imageID":"docker-pullable://docker.io/atomist/dood@sha256:36f2ddd2110904c70bb02d2350f482fc325aecd64dc672b4ed777f76fbd592ad","containerID":"docker://6a2c75f5b101172812f7e90aecc92a4e3d75d91bda7bcac05d396abc4dca9184"}],"qosClass":"Burstable"}`,
				namespace: "api-production",
			};
			const pa = generatePodArgs(p);
			const pc = checkPodState(pa);
			const e = [
				{
					id: "k8s-internal-production:api-production:dood-7d4b7588bd-vptds",
					slug:
						"pod api-production/dood-7d4b7588bd-vptds in Kubernetes cluster k8s-internal-production",
				},
				{
					id:
						"k8s-internal-production:api-production:dood-7d4b7588bd-vptds:dood",
					slug:
						"container dood (atomist/dood:0.1.3-20200323102421) of pod api-production/dood-7d4b7588bd-vptds in Kubernetes cluster k8s-internal-production",
				},
			];
			assert.deepStrictEqual(pc, e);
		});

		it("detects when container is creating too long", () => {
			const p = {
				baseName: "creating",
				name: "creating",
				resourceVersion: 158465639,
				phase: "Pending",
				clusterName: "k8s-internal-demo",
				timestamp: "2020-03-19T20:10:09Z",
				statusJSON: `{"conditions":[{"lastProbeTime":null,"lastTransitionTime":"2020-06-10T15:26:39Z","status":"True","type":"Initialized"},{"lastProbeTime":null,"lastTransitionTime":"2020-06-10T15:26:39Z","message":"containers with unready status: [sleep]","reason":"ContainersNotReady","status":"False","type":"Ready"},{"lastProbeTime":null,"lastTransitionTime":"2020-06-10T15:26:39Z","message":"containers with unready status: [sleep]","reason":"ContainersNotReady","status":"False","type":"ContainersReady"},{"lastProbeTime":null,"lastTransitionTime":"2020-06-10T15:26:39Z","status":"True","type":"PodScheduled"}],"containerStatuses":[{"image":"busybox:1.31.1-uclibc","imageID":"","lastState":{},"name":"sleep","ready":false,"restartCount":0,"state":{"waiting":{"reason":"ContainerCreating"}}}],"hostIP":"10.159.0.6","phase":"Pending","qosClass":"Burstable","startTime":"2020-06-10T15:26:39Z"}`,
				namespace: "production",
			};
			const pa = generatePodArgs(p);
			const pc = checkPodState(pa);
			const e = [
				{
					id: "k8s-internal-demo:production:creating",
					slug:
						"pod production/creating in Kubernetes cluster k8s-internal-demo",
				},
				{
					error:
						"Container sleep (busybox:1.31.1-uclibc) of pod production/creating in Kubernetes cluster k8s-internal-demo has been creating too long",
					id: "k8s-internal-demo:production:creating:sleep",
					slug:
						"container sleep (busybox:1.31.1-uclibc) of pod production/creating in Kubernetes cluster k8s-internal-demo",
				},
			];
			assert.deepStrictEqual(pc, e);
		});

		it("detects when container is in CreateContainerConfigError", () => {
			const p = {
				baseName: "creating",
				name: "creating",
				resourceVersion: 158465639,
				phase: "Pending",
				clusterName: "k8s-internal-demo",
				timestamp: "2020-03-19T20:10:09Z",
				statusJSON: `{"conditions":[{"lastProbeTime":null,"lastTransitionTime":"2020-06-10T15:26:39Z","status":"True","type":"Initialized"},{"lastProbeTime":null,"lastTransitionTime":"2020-06-10T15:26:39Z","message":"containers with unready status: [sleep]","reason":"ContainersNotReady","status":"False","type":"Ready"},{"lastProbeTime":null,"lastTransitionTime":"2020-06-10T15:26:39Z","message":"containers with unready status: [sleep]","reason":"ContainersNotReady","status":"False","type":"ContainersReady"},{"lastProbeTime":null,"lastTransitionTime":"2020-06-10T15:26:39Z","status":"True","type":"PodScheduled"}],"containerStatuses":[{"image":"busybox:1.31.1-uclibc","imageID":"","lastState":{},"name":"sleep","ready":false,"restartCount":0,"state":{"waiting":{"message":"secret \\"missing\\" not found","reason":"CreateContainerConfigError"}}}],"hostIP":"10.159.0.6","phase":"Pending","podIP": "10.12.2.17","qosClass":"Burstable","startTime":"2020-06-10T15:26:39Z"}`,
				namespace: "production",
			};
			const pa = generatePodArgs(p);
			const pc = checkPodState(pa);
			const e = [
				{
					id: "k8s-internal-demo:production:creating",
					slug:
						"pod production/creating in Kubernetes cluster k8s-internal-demo",
				},
				{
					error:
						'Container sleep (busybox:1.31.1-uclibc) of pod production/creating in Kubernetes cluster k8s-internal-demo is in CreateContainerConfigError: `secret "missing" not found`',
					id: "k8s-internal-demo:production:creating:sleep",
					slug:
						"container sleep (busybox:1.31.1-uclibc) of pod production/creating in Kubernetes cluster k8s-internal-demo",
				},
			];
			assert.deepStrictEqual(pc, e);
		});

		it("detects when a pod is deleted", () => {
			const p = {
				baseName: "init",
				name: "init-sleep",
				resourceVersion: 158190338,
				phase: "Deleted",
				clusterName: "k8s-internal-demo",
				timestamp: "2020-03-19T19:23:09Z",
				statusJSON:
					'{"phase":"Deleted","conditions":[{"type":"Initialized","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-19T19:23:21Z"},{"type":"Ready","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-19T19:23:22Z"},{"type":"ContainersReady","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-19T19:23:22Z"},{"type":"PodScheduled","status":"True","lastProbeTime":null,"lastTransitionTime":"2020-03-19T19:23:09Z"}],"hostIP":"10.0.3.197","podIP":"10.12.0.29","startTime":"2020-03-19T19:23:09Z","initContainerStatuses":[{"name":"success","state":{"terminated":{"exitCode":0,"reason":"Completed","startedAt":"2020-03-19T19:23:10Z","finishedAt":"2020-03-19T19:23:20Z","containerID":"containerd://701bc329ef85396fa59e94c5cead8cbbe5210f086619c90dce7b1f3bd02aaf1e"}},"lastState":{},"ready":true,"restartCount":0,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://701bc329ef85396fa59e94c5cead8cbbe5210f086619c90dce7b1f3bd02aaf1e"}],"containerStatuses":[{"name":"sleep","state":{"running":{"startedAt":"2020-03-19T19:23:21Z"}},"lastState":{},"ready":true,"restartCount":0,"image":"docker.io/library/busybox:1.31.1-uclibc","imageID":"docker.io/library/busybox@sha256:2e5566a5fdc78fe7c48627e69e11448a2211f5e6c1544c2ae6262f2799205b51","containerID":"containerd://a35f0076125fc74de40e1716236aee1c15e6ca54d71620cdc993ddea5cb195cd"}],"qosClass":"BestEffort"}',
				namespace: "production",
			};
			const pa = generatePodArgs(p);
			const pc = checkPodState(pa);
			const e = [
				{
					error:
						"Pod production/init-sleep in Kubernetes cluster k8s-internal-demo was deleted",
					id: "k8s-internal-demo:production:init-sleep",
					slug:
						"pod production/init-sleep in Kubernetes cluster k8s-internal-demo",
				},
				{
					error:
						"Container sleep (docker.io/library/busybox:1.31.1-uclibc) of pod production/init-sleep in Kubernetes cluster k8s-internal-demo was deleted",
					id: "k8s-internal-demo:production:init-sleep:sleep",
					slug:
						"container sleep (docker.io/library/busybox:1.31.1-uclibc) of pod production/init-sleep in Kubernetes cluster k8s-internal-demo",
				},
			];
			assert.deepStrictEqual(pc, e);
		});
	});
});
