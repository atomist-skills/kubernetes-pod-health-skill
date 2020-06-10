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
import { checkCluster, checkPodState, podSlug } from "../checks";
import { chatChannelName, configurationToParameters, K8sPodStateConfiguration } from "../parameter";
import { parsePodStatus, PodStatus } from "../pod";
import { ChatChannelQuery, K8sPodStateSubscription } from "../typings/types";
import { ucFirst, dateString } from "../util";

/** Process K8Pod event and send alerts. */
export const handler: EventHandler<K8sPodStateSubscription, K8sPodStateConfiguration> = async ctx => {
    for (const pod of ctx.data.K8Pod) {
        info(`${ucFirst(podSlug(pod))} status: ${pod.statusJSON}`);
    }
    const date = new Date();
    const now = date.getTime();
    const today = dateString(date);
    const reasons: string[] = [];
    for (const configuration of ctx.configuration) {
        const parameterChannels = chatChannelName(configuration.parameters.channels);
        const parameters = configurationToParameters(configuration.parameters);
        const chatChannelResponse = await ctx.graphql.query<ChatChannelQuery>("chatChannel.graphql", { channels: parameterChannels });
        const channels = chatChannelResponse.ChatChannel.filter(c => !c.archived).map(c => c.name);
        const users: string[] = [];
        const destination = { channels, users };

        for (const pod of ctx.data.K8Pod) {
            if (!await checkCluster({
                environment: pod.environment,
                graphql: ctx.graphql,
                resourceProviders: configuration.resourceProviders,
            })) {
                await ctx.audit.log(`Environment ${pod.environment} of ${podSlug(pod)} does not match k8s integrations ` +
                    `in configuration ${configuration.name}`);
                continue;
            }

            let status: PodStatus;
            try {
                status = parsePodStatus(pod);
            } catch (e) {
                await ctx.audit.log(`Failed to parse status of ${podSlug(pod)}: ${e.message}`);
                continue;
            }

            const podContainers = checkPodState({ now, parameters, pod, status });

            for (const container of podContainers) {
                const id = `${configuration.name}:${container.id}:${today}`;
                const options: MessageOptions = { id };
                let message: string;
                if (container.error === "DELETE") {
                    container.error = undefined;
                    try {
                        await ctx.message.delete(destination, { id });
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
