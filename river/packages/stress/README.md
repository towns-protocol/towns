# Stress

Running things in jest comes with like a huge amount of overhead per process. No f'ing clue what it's doing. Running things in node with custom-loader.mjs takes less overhead. (from looking at Activity Monitor while running clients)

Times simpile test just printing out os stats:

```
jest: 731.20s user 196.02s system 765% cpu 2:01.08 total
node: 119.62s user 17.02s system 779% cpu 17.533 total // 7x speedup!!!
```

# Directions

Use files in scripts dir to launch load tests
