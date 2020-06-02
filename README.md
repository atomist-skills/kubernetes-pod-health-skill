# `atomist/kubernetes-pod-health-skill`

Report when pods in a Kubernetes cluster are not healthy.

<!---atomist-skill-readme:start--->

[Code](https://github.com/atomist-skills/kubernetes-pod-health-skill) - [Issues](https://github.com/atomist-skills/kubernetes-pod-health-skill/issues)

## What it's useful for

This skill will post Slack messages when pods in your Kubernetes
cluster(s) are not healthy.

Kubernetes is great, sometimes too great.  We have come to rely on
Kubernetes monitoring and fixing the resources we run on it,
restarting failed containers and autoscaling clusters to accommodate
increasing workloads, and therefore rarely check to make sure
everything is running smoothly.  This skill takes the burden off you
and your team to periodically check the health of your applications or
manually verify that a new deployment was successful.

This skill, in coordination with the Atomist Kubernetes provider
integration, monitors the activity of pods in your cluster and
notifies you when:

-   A pod container is in image pull back-off.
-   A pod container is in crash loop back-off.
-   A pod container is OOMKilled, i.e., killed because it has used too much memory.
-   A pod init container has failed too many times.
-   A pod container restarts too many times.
-   A pod container is not in a ready state.

This skill will alert you at most once per day per unique
pod/container.  This skill will _not_ alert on pods/containers in
namespaces that start with `kube-`.

Let this skill take care of monitoring your Kubernetes resources so
you can focus on developing and improving them.

## Before you get started

Connect and configure these integrations:

1.  **Kubernetes**
2.  **Slack**

Both the **Kubernetes** and **Slack** integrations must be configured
to used this skill.  This skill will send a notification message to
the configured Slack channel(s) when a Kubernetes pod is unhealthy.

## How to configure

1.  **Enter a unique name for this configuration**

    If this is the first time you are configuring this skill, you can
    accept the default configuration name, "Kubernetes Pod Health
    Monitor".  If you are creating a second configuration, e.g., so
    you can provide different configuration values, enter a name that
    is unique among all configurations for this skill.

    ![name parameter](docs/images/param-name.png)

2.  **Enter the chat channel(s) to send alerts to**

    The only required configuration parameter is the name of the chat
    channel(s) you want to send the Kubernetes pod health alerts to.
    You must enter one or more channel names.  Alerts will be sent to
    all chat channels entered.  To enter more than one channel, click
    the "Add" button so additional text boxes will appear.

    ![chat channel parameter](docs/images/param-chat-channels.png)

3.  **Review remaining configuration**

    We recommend you accept the default values for all remaining
    configuration values.

    Here is a brief run-through of the available options.

    -   _Pod container restarts_

        Alert if the count of pod container restarts reaches this
        value or higher.

        ![max container restarts parameter](docs/images/param-restarts.png)

    -   _Pod container not ready_

        Alert if pod container is not ready after amount of time
        selected.

        ![container not ready delay parameter](docs/images/param-not-ready.png)

4.  **Submit the skill configuration**

    Click the "Submit" button to save your configuration and activate
    the skill.

    ![submit configuration](docs/images/config-submit.png)

[regexp]: https://www.regular-expressions.info/ (Regular Expressions)
[namespace]: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/

## How to use it

1.  **Configure the skill**

    Provide the name of at least one chat channel where you want the
    pod health alerts to go.  See the above section for more details
    on how to configure the skill and the meaning of various
    configuration parameters.

2.  **Stop worrying**

    No longer waste time going to a dashboard or running `kubectl`
    commands to check on the health of pods in your Kubernetes
    clusters.  Stop worrying about the health of pods in your
    Kubernetes clusters, knowing you only need to take action when you
    see a chat message!  _Vive la ChatOps!_

<!---atomist-skill-readme:end--->

---

Created by [Atomist][atomist].
Need Help?  [Join our Slack workspace][slack].

[atomist]: https://atomist.com/ (Atomist - Automate All the Software Things)
[slack]: https://join.atomist.com/ (Atomist Community Slack) 
