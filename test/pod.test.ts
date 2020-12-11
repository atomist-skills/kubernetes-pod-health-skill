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

import { parsePodStatus } from "../lib/pod";

describe("pod", () => {
	describe("parsePodStatus", () => {
		it("parses pod status properly", () => {
			const p: any = {
				statusJSON:
					'{"phase":"Pending","conditions":[{"type":"Initialized","status":"True","lastProbeTime":null,"lastTransitionTime":"2019-12-08T19:08:18Z"},{"type":"Ready","status":"False","lastProbeTime":null,"lastTransitionTime":"2019-12-08T19:13:46Z","reason":"ContainersNotReady","message":"containers with unready status: [io0]"},{"type":"ContainersReady","status":"False","lastProbeTime":null,"lastTransitionTime":"2019-12-08T19:13:46Z","reason":"ContainersNotReady","message":"containers with unready status: [io0]"},{"type":"PodScheduled","status":"True","lastProbeTime":null,"lastTransitionTime":"2019-12-08T19:08:18Z"}],"hostIP":"10.0.0.60","startTime":"2019-12-08T19:08:18Z","containerStatuses":[{"name":"io0","state":{"waiting":{"reason":"ContainerCreating"}},"lastState":{},"ready":false,"restartCount":0,"image":"atomist/io0:0.2.2-20191208190707","imageID":""}],"qosClass":"Burstable"}',
			};
			const s = parsePodStatus(p);
			const e: any = {
				phase: "Pending",
				conditions: [
					{
						type: "Initialized",
						status: "True",
						lastProbeTime: null,
						lastTransitionTime: new Date("2019-12-08T19:08:18Z"),
					},
					{
						type: "Ready",
						status: "False",
						lastProbeTime: null,
						lastTransitionTime: new Date("2019-12-08T19:13:46Z"),
						reason: "ContainersNotReady",
						message: "containers with unready status: [io0]",
					},
					{
						type: "ContainersReady",
						status: "False",
						lastProbeTime: null,
						lastTransitionTime: new Date("2019-12-08T19:13:46Z"),
						reason: "ContainersNotReady",
						message: "containers with unready status: [io0]",
					},
					{
						type: "PodScheduled",
						status: "True",
						lastProbeTime: null,
						lastTransitionTime: new Date("2019-12-08T19:08:18Z"),
					},
				],
				hostIP: "10.0.0.60",
				startTime: new Date("2019-12-08T19:08:18Z"),
				containerStatuses: [
					{
						name: "io0",
						state: {
							waiting: {
								reason: "ContainerCreating",
							},
						},
						lastState: {},
						ready: false,
						restartCount: 0,
						image: "atomist/io0:0.2.2-20191208190707",
						imageID: "",
					},
				],
				qosClass: "Burstable",
			};
			assert.deepStrictEqual(s, e);
		});
	});
});
