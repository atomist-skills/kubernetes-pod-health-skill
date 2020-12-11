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
	EventHandler,
	HandlerStatus,
	log,
	MessageOptions,
	status,
} from "@atomist/skill";

import { checkCluster, checkPodState, podSlug } from "../checks";
import {
	chatChannelName,
	configurationToParameters,
	K8sPodStateConfiguration,
} from "../parameter";
import { parsePodStatus, PodStatus } from "../pod";
import { ChatChannelQuery, K8sPodStateSubscription } from "../typings/types";
import { dateString, ucFirst } from "../util";

/** Process K8Pod event and send alerts. */
export const handler: EventHandler<
	K8sPodStateSubscription,
	K8sPodStateConfiguration
> = async ctx => {
	for (const pod of ctx.data.K8Pod) {
		log.info(`${ucFirst(podSlug(pod))} status: ${pod.statusJSON}`);
	}
	const date = new Date();
	const now = date.getTime();
	const today = dateString(date);
	const reasons: HandlerStatus[] = [];
	const configuration = ctx.configuration;
	const parameterChannels = chatChannelName(
		configuration.parameters.channels,
	);
	const parameters = configurationToParameters(configuration.parameters);
	const chatChannelResponse = await ctx.graphql.query<ChatChannelQuery>(
		"chatChannel.graphql",
		{
			channels: parameterChannels,
		},
	);
	const channels = chatChannelResponse.ChatChannel.filter(
		c => !c.archived,
	).map(c => c.name);
	const users: string[] = [];
	const destination = { channels, users };

	for (const pod of ctx.data.K8Pod) {
		if (
			!(await checkCluster({
				clusterName: pod.clusterName,
				graphql: ctx.graphql,
				resourceProviders: configuration.resourceProviders,
			}))
		) {
			await ctx.audit.log(
				`Cluster ${pod.clusterName} of ${podSlug(
					pod,
				)} does not match k8s integrations in configuration ${
					configuration.name
				}`,
			);
			continue;
		}

		let status: PodStatus;
		try {
			status = parsePodStatus(pod);
		} catch (e) {
			const reason = `Failed to parse status of ${podSlug(pod)}: ${
				e.message
			}`;
			reasons.push({ code: 1, reason });
			await ctx.audit.log(reason);
			continue;
		}

		const podContainers = checkPodState({
			now,
			parameters,
			pod,
			status,
		});

		for (const container of podContainers) {
			const id = `${configuration.name}:${container.id}:${today}`;
			const options: MessageOptions = { id };
			let message: string;
			if (!container.error) {
				options.post = "update_only";
				message = `${ucFirst(container.slug)} recovered`;
			} else {
				message = container.error;
				if (/ was deleted$/.test(container.error)) {
					options.post = "update_only";
				}
			}
			try {
				await ctx.message.send(message, destination, options);
				if (container.error) {
					await ctx.audit.log(container.error);
				}
			} catch (e) {
				const reason = `Failed to send message ${options.id}: ${e.message}`;
				reasons.push({ code: 1, reason });
				await ctx.audit.log(reason);
			}
		}

		reasons.push(
			...podContainers
				.map(c => c.error)
				.filter(m => !!m)
				.map(m => ({ code: 0, reason: m })),
		);
	}

	if (reasons.length > 0) {
		return {
			code: reasons.reduce((acc, val) => (acc += val.code), 0),
			reason: reasons.map(r => r.reason).join("; "),
		};
	} else {
		return status.success("All pods healthy").hidden();
	}
};
