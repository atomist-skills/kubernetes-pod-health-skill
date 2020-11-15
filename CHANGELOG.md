# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased](https://github.com/atomist-skills/kubernetes-pod-health-skill/compare/0.5.2...HEAD)

### Changed

-   Update icon. [f9a7493](https://github.com/atomist-skills/kubernetes-pod-health-skill/commit/f9a7493f0cf5b36a032fec120b330e4c61ca923f)

## [0.5.2](https://github.com/atomist-skills/kubernetes-pod-health-skill/compare/0.5.1...0.5.2) - 2020-11-09

### Fixed

-   Memory limited Exceeded. [#38](https://github.com/atomist-skills/kubernetes-pod-health-skill/issues/38)

## [0.5.1](https://github.com/atomist-skills/kubernetes-pod-health-skill/compare/0.5.0...0.5.1) - 2020-10-14

### Changed

-   Remove single dispatch. [#26](https://github.com/atomist-skills/kubernetes-pod-health-skill/issues/26)

## [0.5.0](https://github.com/atomist-skills/kubernetes-pod-health-skill/compare/0.4.0...0.5.0) - 2020-10-09

### Changed

-   Move to multiple-dispatch. [#22](https://github.com/atomist-skills/kubernetes-pod-health-skill/issues/22)
-   Return success if successful. [38f9f85](https://github.com/atomist-skills/kubernetes-pod-health-skill/commit/38f9f854947a27886f8ce6889fb48081ea1fc698)

## [0.4.0](https://github.com/atomist-skills/kubernetes-pod-health-skill/compare/0.3.0...0.4.0) - 2020-07-28

### Added

-   Handle deleted pods. [90265cb](https://github.com/atomist-skills/kubernetes-pod-health-skill/commit/90265cb195cfc1cb828403f379a79c734a7854e1)

### Changed

-   Upgrade @atomist/skill. [1762a9f](https://github.com/atomist-skills/kubernetes-pod-health-skill/commit/1762a9f8862658b6ee87c84c2b896dbf9f4272fb)

## [0.3.0](https://github.com/atomist-skills/kubernetes-pod-health-skill/compare/0.2.0...0.3.0) - 2020-07-01

### Changed

-   Migrate from slack to chat provider. [1c18d27](https://github.com/atomist-skills/kubernetes-pod-health-skill/commit/1c18d2734f3fad089fac570fcc68566f71709c15)

## [0.2.0](https://github.com/atomist-skills/kubernetes-pod-health-skill/tree/0.2.0) - 2020-06-19

### Added

-   Add check for OOMKilled status. [#4](https://github.com/atomist-skills/kubernetes-pod-health-skill/issues/4)
-   Add container creating checks. [2392cd5](https://github.com/atomist-skills/kubernetes-pod-health-skill/commit/2392cd5497dc8e5148b7b94bd56c9286402b3a02)

### Changed

-   Update README per template. [#5](https://github.com/atomist-skills/kubernetes-pod-health-skill/issues/5)
-   Use container checks for init containers. [dc84883](https://github.com/atomist-skills/kubernetes-pod-health-skill/commit/dc848832b122452cd4008331d0ac2dd843a58bac)
-   Put date in message id to ensure 1 per day. [4b3781d](https://github.com/atomist-skills/kubernetes-pod-health-skill/commit/4b3781d9fa72eb653098f5b742687e0c911ba3a9)
