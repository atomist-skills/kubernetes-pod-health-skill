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
import { parameterDefaults } from "../lib/parameter";

describe("parameter", () => {

    describe("parameterDefaults", () => {

        it("populates default values", () => {
            const p = {
                channels: ["lucinda-williams"],
            };
            parameterDefaults(p);
            const e = {
                channels: ["lucinda-williams"],
                crashLoopBackOff: true,
                imagePullBackOff: true,
                oomKilled: true,
                initContainerFailureCount: 3,
                intervalMinutes: 1440,
                maxRestarts: 10,
                namespaceExcludeRegExp: "^kube-",
                notReadyDelaySeconds: 600,
                notScheduledDelaySeconds: 600,
            };
            assert.deepStrictEqual(p, e);
        });

        it("retains provided values", () => {
            const p = {
                channels: ["lucinda", "williams"],
                clusterExcludeRegExp: "junk$",
                clusterIncludeRegExp: "^prod",
                crashLoopBackOff: true,
                imagePullBackOff: false,
                oomKilled: false,
                initContainerFailureCount: 20,
                intervalMinutes: 144,
                maxRestarts: 100,
                namespaceExcludeRegExp: "^k8s-",
                namespaceIncludeRegExp: "-system$",
                notReadyDelaySeconds: 6000,
                notScheduledDelaySeconds: 60,
            };
            parameterDefaults(p);
            const e = {
                channels: ["lucinda", "williams"],
                clusterExcludeRegExp: "junk$",
                clusterIncludeRegExp: "^prod",
                crashLoopBackOff: true,
                imagePullBackOff: false,
                oomKilled: false,
                initContainerFailureCount: 20,
                intervalMinutes: 144,
                maxRestarts: 100,
                namespaceExcludeRegExp: "^k8s-",
                namespaceIncludeRegExp: "-system$",
                notReadyDelaySeconds: 6000,
                notScheduledDelaySeconds: 60,
            };
            assert.deepStrictEqual(p, e);
        });

        it("throws an error if no channels", () => {
            const cs: string[][] = [undefined, []];
            cs.forEach(c => {
                assert.throws(() => parameterDefaults({
                    channels: c,
                    crashLoopBackOff: true,
                    imagePullBackOff: false,
                    oomKilled: false,
                }), /Missing required configuration parameter: channels: /);
            });
        });

    });

});
