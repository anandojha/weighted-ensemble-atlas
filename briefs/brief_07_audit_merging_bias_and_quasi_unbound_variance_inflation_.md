# Research Brief · Audit merging bias and quasi unbound variance inflation across binless Weighted Ensemble resamplers

- Category · Estimator audit
- Subfield · Adaptive Binning & Allocation

## Problem Statement

Standard REVO, Cutoff REVO, MABL, and CoWERA apply distinct pairwise distance exponents and cloning eligibility cutoffs that alter exit weight distributions and multi lag Markov state model residence times.

## Concrete Attack Plan

Run matched 48 walker ensembles in wepy and WESTPA 2.0 on T4 lysozyme L99A p xylene and SAMPL6 OA G6 across resampling intervals of 10, 50, and 100 ps, then compare Hill flux against standard MSMs and merging bias corrected MBC MSMs across lag multiples from 2 to 10.
