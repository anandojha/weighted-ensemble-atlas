# Research Brief · Persistent multi walker GPU batching with asynchronous HDF5 lineage streaming for neural potentials

- Category · Speed up
- Subfield · Software, GPU Engines & Workflows

## Problem Statement

Russo et al. 2022 shrank trajectory file footprints by up to 85 percent through per iteration HDF5 archives in WESTPA 2.0, and Aghili et al. 2025 benchmarked neural molecular dynamics propagators across nine proteins via WESTPA and TICA metrics. Per iteration worker launch latency and host device serialization still limit short tau neural potential throughput.

## Concrete Attack Plan

Couple persistent batched multi walker GPU contexts in OpenMM 7 and wepy with asynchronous HDF5 lineage writers from Russo et al. 2022 and low variance pruning from Plotnikov & Ahn 2024 on the nine protein suite of Aghili et al. 2025.
