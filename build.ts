#!/usr/bin/env ts-node --swc

import { exec } from "child_process";
import { promisify } from "util";

const _exec = promisify(exec);

const IMAGE_NAME = "joaonortech/rust-multiarch";

const ARCHS = [
  {
    name: "amd64",

    finalName: `${IMAGE_NAME}:latest-amd64`,
  },
  {
    name: "arm64",
    finalName: `${IMAGE_NAME}:latest-arm64`,
  },
  {
    name: "armv7",
    finalName: `${IMAGE_NAME}:latest-armv7`,
  },
];

const USER_ARCHS = [
  {
    name: "amd64",
    buildName: buildAmd64Name,
    platform: "linux/amd64",
  },
  {
    name: "arm64",
    buildName: buildArm64Name,
    platform: "linux/arm64",
  },
  {
    name: "armv7",
    buildName: buildArmv7Name,
    platform: "linux/arm/v7",
  },
];

async function main() {
  const builds = ARCHS.map((arch) => async () => {
    console.log(`BUILD ${arch.name}`);
    for (const userArch of USER_ARCHS) {
      await $(
        `docker buildx build --push --platform ${userArch.platform
        } -t ${userArch.buildName(arch)} -f Dockerfile.${arch.name}-${userArch.name
        } .`
      );
    }
  });

  await Promise.all(builds.map((build) => build()));

  for (const arch of ARCHS) {
    try {
      await $(`docker manifest rm ${arch.finalName}`);
    } catch (error) {}

    await $(`docker manifest create ${arch.finalName} \\
      ${USER_ARCHS.map((userArch) => userArch.buildName(arch)).join(" ")}
    `);

    for (const userArch of USER_ARCHS) {
      await $(`docker manifest annotate ${arch.finalName} \\
        ${userArch.buildName(arch)} --os linux --arch ${userArch.name === "armv7" ? "arm" : userArch.name} ${userArch.name === "--variant armv7" ? "v7" : ""}
      `);
    }
    await $(`docker manifest push ${arch.finalName}`);
  }
}

main();

function buildArm64Name(arch: { name: string }) {
  return `${IMAGE_NAME}:build-${arch.name}-from-arm64`;
}

function buildAmd64Name(arch: { name: string }) {
  return `${IMAGE_NAME}:build-${arch.name}-from-amd64`;
}

function buildArmv7Name(arch: { name: string }) {
  return `${IMAGE_NAME}:build-${arch.name}-from-armv7`;
}

async function $(cmd: string) {
  console.log(`$ ${cmd}`);
  const com = await _exec(cmd, {});
  console.log(com.stderr);
  console.log(com.stdout);
}
