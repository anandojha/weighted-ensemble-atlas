# Research Brief · Quantify latent space rotation hysteresis and Kish effective sample size drop during online neural coordinate retraining

- Category · Estimator audit
- Subfield · Collective Variables & Deep Learning

## Problem Statement

Periodic retraining of SPIB or convolutional VAE encoders rotates latent coordinates between Weighted Ensemble cycles, risking destructive merges of previously separated bottleneck trajectories and finite sample weight skew.

## Concrete Attack Plan

Instrument WESTPA 2.0 on SynMD NTL9 and atomistic chignolin across retraining intervals of 5, 25, and 100 cycles, track Kish effective sample size (sum w_i)^2 / sum w_i^2 across encoder updates, and evaluate Orthogonal Procrustes latent alignment between consecutive neural checkpoints.
