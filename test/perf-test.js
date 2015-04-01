var Hgt = require('../').Hgt,
    hgt = new Hgt(__dirname + '/data/N57E011.hgt', [57, 11]),
    warmupRounds = 10000000,
    testRounds = 10000000,
    start,
    i,
    t;

// Warmup
for (i = 0; i < warmupRounds; i++) {
    hgt.getElevation([Math.random() + 57, Math.random() + 11]);
}

start = new Date().getTime();

for (i = 0; i < testRounds; i++) {
    hgt.getElevation([Math.random() + 57, Math.random() + 11]);
}

t = new Date().getTime() - start;

console.log((1000 / (t / testRounds)) + ' ops/s (' + testRounds + ' ops in ' + t + ' ms)');
