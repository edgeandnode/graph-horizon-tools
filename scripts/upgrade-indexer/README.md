### Setup

```bash
cd scripts/upgrade-indexer

kubectl exec -ti shell-0 -- bash -s < setup.sh
kubectl cp . shell-0:/
kubectl exec shell-0 -- bash -c 'chmod +x /*.sh'
kubectl exec -ti shell-0 -- env BATCH_SIZE=2 bash -s < migrate.sh
```

### Migrate allos

```bash
cd scripts/upgrade-indexer
kubectl exec -ti shell-0 -- bash -s < migrate.sh
```

### Check status

```bash
cd scripts/upgrade-indexer
kubectl exec -ti shell-0 -- bash -s < status.sh
```

### Check allos diff

```bash
cd scripts/upgrade-indexer
kubectl exec -ti shell-0 -- bash -s < fetch.sh && \
kubectl cp shell-0:/allocations.json allos-snapshot-current.json && \
./compare.sh
```

### One script to rule them all

```bash
# Just do it
BATCH_SIZE=10 RUNS=3 ./run.sh
```