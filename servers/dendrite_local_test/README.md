# Run local dendirete test server

Build dendrite:

```bash
./build.sh
```

Modify `vars.env` and `dendrite.yaml` as desired and deploy:

```bash
./deploy.sh
```

Run all dendrites in background:

```bash
./run_all.sh
```

Stop all dendrites runnign in background:

```bash
./stop_all.sh
```

Run single dendrite number N in foreground:

```bash
./run_single.sh 0
```

Delete deployment:

```bash
./clean.sh 0
```
