# The in-browser Linux lab: what is in this folder, and where it comes from

MARGA runs a real Linux kernel inside your browser tab. Nothing is sent to a server: the machine is emulated by a program that runs in the page.

| File | What it is | Licence |
| --- | --- | --- |
| libv86.js, v86.wasm | The v86 x86 PC emulator, version 0.5.473, from the npm package `v86` | BSD 2-Clause |
| seabios.bin, vgabios.bin | BIOS images that ship with v86 (SeaBIOS and VGABIOS) | LGPL 3 and LGPL 2.1 |
| bzImage | The Linux kernel 6.8.12 for 32-bit x86, built from the Ubuntu `linux-source-6.8.0` package with the configuration in `kernel.config` (a small "tinyconfig" plus serial console, TTY, tmpfs, procfs, sysfs, IPv4 and sockets) | GPL 2 |
| busybox | BusyBox 1.36.1, the static 32-bit build from the Ubuntu package `busybox-static` | GPL 2 |
| openssl (inside initrd.gz) | OpenSSL 3.0.13, built static for 32-bit x86 from the Ubuntu source tarball `openssl_3.0.13.orig.tar.gz` with most algorithms switched off (see `tools/` notes in the README); used by the TLS labs | Apache 2.0 |
| initrd.gz | The root file system: BusyBox, `init`, and the lab scenarios in `scenarios/`. Rebuilt with `tools/mkvm.sh` | GPL 2 for BusyBox; the scenario scripts are part of MARGA |
| xterm.js, xterm.css, addon-fit.js | The xterm.js terminal widget, version 6.0.0, from the npm packages `@xterm/xterm` and `@xterm/addon-fit` | MIT |

## Source code for the GPL parts

The Linux kernel source is the Ubuntu package `linux-source-6.8.0` (6.8.0-147). The BusyBox source is the Ubuntu source package `busybox` 1:1.36.1-6ubuntu3. Both are published on archive.ubuntu.com. To rebuild the kernel: unpack the source, copy `kernel.config` to `.config`, then run `make ARCH=x86 olddefconfig` and `make ARCH=x86 bzImage`. Copy `arch/x86/boot/bzImage` to this folder.

## Why a custom kernel

v86 emulates a 32-bit PC without PAE. The kernels shipped in Ubuntu for 32-bit PCs need PAE, so they do not start. This kernel is built for a plain 32-bit processor.

## What this lab is and is not

It is a real kernel and real BusyBox tools, so `ps`, `df`, `mount`, `kill`, `/proc` and the file system behave as on Linux. It is a small machine: there is no systemd, no package manager, no network to the internet, and about 96 MB of memory. Commands from other distributions may be missing. The checks inside each scenario read the actual state of the machine.

The package and TLS labs also use small teaching shell scripts (`apt`, `dpkg`, `apt-mark`, `shop-tls`, `update-ca-certificates`) in `src/vm/shims/`. They imitate the real tools on a tiny local repository and are not the real apt or dpkg. The test certificates are made by `tools/mkcerts.sh` and are not valid for anything outside the labs.
