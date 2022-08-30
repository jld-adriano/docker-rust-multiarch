#!/usr/bin/env ts-node --swc

import { exec } from "child_process"
import { promisify } from "util"

const _exec = promisify(exec)

const IMAGE_NAME = "joaonortech/rust-multiarch"

const ARCHS = [
  {
    name: "amd64",
    docker: "amd64",
    platform: "linux/amd64",
  },
  {
    name: "arm64v8",
    docker: "arm64",
    platform: "linux/arm64",
  },
  {
    name: "arm32v7",
    docker: "arm",
    platform: "linux/arm/v7",
  },
]

async function main() {
  const builds = ARCHS.map((arch) => async () => {
    console.log(`BUILD ${arch.name}`)
    const preName = `${IMAGE_NAME}:${arch.name}`
    await $(
      `docker buildx build --push --platform ${arch.platform} -t ${preName} -f Dockerfile.${arch.name} .`
    )
  })

  await Promise.all(builds.map((build) => build()))

  const finalName = `${IMAGE_NAME}:latest`
  await $(`docker manifest rm ${finalName}`)
  await $(`docker manifest create ${finalName} \
    ${ARCHS.map((arch) => `${`${IMAGE_NAME}:${arch.name}`}`).join(" ")}
  `)

  const annotates = ARCHS.map((arch) => async () => {
    await $(
      `docker manifest annotate "${finalName}" ${`${IMAGE_NAME}:${arch.name}`} --arch ${
        arch.docker
      }`
    )
  })
  await Promise.all(annotates.map((annotate) => annotate()))
  await $(`docker manifest push "${IMAGE_NAME}:latest"`)
  await $(`docker manifest inspect "${IMAGE_NAME}:latest"`)
}

main()

async function $(cmd: string) {
  console.log(`$ ${cmd}`)
  const com = await _exec(cmd, {})
  console.log(com.stderr)
  console.log(com.stdout)
}
