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

import { EventHandler } from "@atomist/skill/lib/handler";
import { info } from "@atomist/skill/lib/log";
import { MessageOptions } from "@atomist/skill/lib/message";
import {
    checkPodState,
    podSlug,
} from "../checks";
import {
    K8sPodStateConfiguration,
    configurationToParameters,
} from "../parameter";
import {
    parsePodStatus,
    PodStatus,
} from "../pod";
import {
    ChatChannelQuery,
    K8sPodStateSubscription,
} from "../typings/types";
import { ucFirst } from "../util";

/** Process K8Pod event and send alerts. */
export const handler: EventHandler<K8sPodStateSubscription, K8sPodStateConfiguration> = async ctx => {
    for (const pod of ctx.data.K8Pod) {
        info(`${ucFirst(podSlug(pod))} status: ${pod.statusJSON}`);
    }
    const now = new Date().getTime();
    const reasons: string[] = [];
    for (const configuration of ctx.configuration) {
        const parameters = configurationToParameters(configuration.parameters);
        const parameterChannels = configuration.parameters.channels;
        const chatChannelResponse = await ctx.graphql.query<ChatChannelQuery>("chatChannel.graphql", { channels: parameterChannels });
        const channels = chatChannelResponse.ChatChannel.filter(c => !c.archived).map(c => c.name);
        const users: string[] = [];
        const destination = { channels, users };
        const ttl = 24 * 60 * 60 * 1000; // one day

        for (const pod of ctx.data.K8Pod) {
            let status: PodStatus;
            try {
                status = parsePodStatus(pod);
            } catch (e) {
                const msg = `Failed to parse status of ${podSlug(pod)}: ${e.message}`;
                await ctx.audit.log(msg);
                continue;
            }

            const podContainers = await checkPodState({ now, parameters, pod, status });

            for (const container of podContainers) {
                const options: MessageOptions = {
                    id: container.id,
                    ttl,
                };
                let message: string;
                if (container.error === "DELETE") {
                    container.error = undefined;
                    try {
                        await ctx.message.delete(destination, { id: container.id });
                    } catch (e) {
                        await ctx.audit.log(`Failed to delete message ${options.id}: ${e.message}`);
                    }
                } else {
                    if (!container.error) {
                        options.post = "update_only";
                        message = `${ucFirst(container.slug)} recovered`;
                    } else {
                        message = container.error;
                    }
                    try {
                        await ctx.message.send(message, destination, options);
                        if (container.error) {
                            await ctx.audit.log(container.error);
                        }
                    } catch (e) {
                        await ctx.audit.log(`Failed to send message ${options.id}: ${e.message}`);
                    }
                }
            }

            reasons.push(...podContainers.map(c => c.error).filter(m => !!m));
        }
    }

    if (reasons.length > 0) {
        return {
            code: reasons.length,
            reason: reasons.join("; "),
        };
    } else {
        return {
            code: 0,
            reason: "All pods healthy",
            visibility: "hidden",
        };
    }
};
