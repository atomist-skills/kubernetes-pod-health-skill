# `atomist/kubernetes-pod-health-skill`

Report when pods in a Kubernetes cluster are not healthy.

## Overview

<!---atomist-skill-readme:start--->

In coordination with the k8vent utility, report when containers in
pods in Kubernetes clusters are not healthy.

### Enabling

You must supply a Slack channel to send the alerts to.

## Configuration

### Slack channel

Provide the name of the Slack channel where you want messages sent
when a pod is not healthy.

## Integrations

### Kubernetes

You must have deployed [k8vent][] to at least one Kubernetes cluster.

### Slack

This skill will send a notification message to the configured Slack
channel when a pod is unhealthy.

<!---atomist-skill-readme:end--->

---

Created by [Atomist][atomist].
Need Help?  [Join our Slack workspace][slack].

[atomist]: https://atomist.com/ (Atomist - How Teams Deliver Software)
[slack]: https://join.atomist.com/ (Atomist Community Slack) 
