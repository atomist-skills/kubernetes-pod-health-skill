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
import { configurationToParameters } from "../lib/parameter";

describe("parameter", () => {

    describe("parameterDefaults", () => {

        it("populates default values", () => {
            const c = {
                channels: ["lucinda-williams"],
            };
            const p = configurationToParameters(c);
            const e = {
                crashLoopBackOff: true,
                imagePullBackOff: true,
                initContainerFailureCount: 3,
                maxRestarts: 10,
                namespaceExcludeRegExp: "^kube-",
                notReadyDelaySeconds: 600,
                notScheduledDelaySeconds: 600,
                oomKilled: true,
            };
            assert.deepStrictEqual(p, e);
        });

        it("retains provided values", () => {
            const c = {
                channels: ["lucinda", "williams"],
                maxRestarts: "100",
                notReadyDelay: "60",
            };
            const p = configurationToParameters(c);
            const e = {
                crashLoopBackOff: true,
                imagePullBackOff: true,
                initContainerFailureCount: 3,
                maxRestarts: 100,
                namespaceExcludeRegExp: "^kube-",
                notReadyDelaySeconds: 3600,
                notScheduledDelaySeconds: 600,
                oomKilled: true,
            };
            assert.deepStrictEqual(p, e);
        });

        it("sets maxRestarts to zero", () => {
            const c = {
                channels: ["lucinda-williams"],
                maxRestarts: "0",
            };
            const p = configurationToParameters(c);
            const e = {
                crashLoopBackOff: true,
                imagePullBackOff: true,
                initContainerFailureCount: 3,
                maxRestarts: 0,
                namespaceExcludeRegExp: "^kube-",
                notReadyDelaySeconds: 600,
                notScheduledDelaySeconds: 600,
                oomKilled: true,
            };
            assert.deepStrictEqual(p, e);
        });

        it("sets notReadyDelaySeconds to zero", () => {
            const c = {
                channels: ["lucinda-williams"],
                notReadyDelay: "0",
            };
            const p = configurationToParameters(c);
            const e = {
                crashLoopBackOff: true,
                imagePullBackOff: true,
                initContainerFailureCount: 3,
                maxRestarts: 10,
                namespaceExcludeRegExp: "^kube-",
                notReadyDelaySeconds: 0,
                notScheduledDelaySeconds: 600,
                oomKilled: true,
            };
            assert.deepStrictEqual(p, e);
        });

        it("throws an error if no channels", () => {
            const cs: string[][] = [undefined, []];
            cs.forEach(c => {
                assert.throws(() => configurationToParameters({
                    channels: c,
                    maxRestarts: "7",
                }), /Missing required configuration parameter: channels: /);
            });
        });

    });

});
