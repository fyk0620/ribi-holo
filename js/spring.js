
window.Ribi = window.Ribi || {};

(function (R) {
  const now = () => performance.now();

  
  const tasks = new Set();
  const afterFrame = new Set();
  let rafId = null;
  let inRun = false;

  function run() {
    rafId = null;
    inRun = true;
    const t = now();
    tasks.forEach((task) => {
      if (!task.callback(t)) {
        tasks.delete(task);
        task.resolve();
      }
    });
    afterFrame.forEach((fn) => fn());
    inRun = false;
    if (tasks.size && rafId === null) rafId = requestAnimationFrame(run);
  }

  function loop(callback) {
    const task = { callback };
    task.promise = new Promise((resolve) => (task.resolve = resolve));
    tasks.add(task);
    if (rafId === null) rafId = requestAnimationFrame(run);
    return task;
  }

  function tickSpring(ctx, lastValue, currentValue, targetValue) {
    if (typeof currentValue === 'number') {
      const delta = targetValue - currentValue;
      const velocity = (currentValue - lastValue) / (ctx.dt || 1 / 60); 
      const spring = ctx.opts.stiffness * delta;
      const damper = ctx.opts.damping * velocity;
      const acceleration = (spring - damper) * ctx.invMass;
      const d = (velocity + acceleration) * ctx.dt;
      if (Math.abs(d) < ctx.opts.precision && Math.abs(delta) < ctx.opts.precision) {
        return targetValue; 
      }
      ctx.settled = false; 
      return currentValue + d;
    } else if (typeof currentValue === 'object') {
      const next = {};
      for (const k in currentValue) {
        next[k] = tickSpring(ctx, lastValue[k], currentValue[k], targetValue[k]);
      }
      return next;
    }
    throw new Error('Cannot spring ' + typeof currentValue + ' values');
  }

  function spring(initial, opts = {}, onChange = () => {}) {
    const { stiffness = 0.15, damping = 0.8, precision = 0.01 } = opts;
    let value = initial;
    let lastTime;
    let task;
    let lastValue = initial;
    let targetValue = initial;
    let invMass = 1;
    let invMassRecoveryRate = 0;
    let cancelTask = false;

    function set(newValue, o = {}) {
      targetValue = newValue;
      if (value == null || o.hard || (api.stiffness >= 1 && api.damping >= 1)) {
        cancelTask = true; 
        lastTime = now();
        lastValue = newValue;
        value = targetValue;
        onChange(value);
        return Promise.resolve();
      } else if (o.soft) {
        const rate = o.soft === true ? 0.5 : +o.soft;
        invMassRecoveryRate = 1 / (rate * 60);
        invMass = 0; 
      }
      if (!task) {
        lastTime = now();
        cancelTask = false;
        task = loop((t) => {
          if (cancelTask) {
            cancelTask = false;
            task = null;
            return false;
          }
          invMass = Math.min(invMass + invMassRecoveryRate, 1);
          
          
          const ctx = { invMass, opts: api, settled: true, dt: Math.min(((t - lastTime) * 60) / 1000, 2) };
          const next = tickSpring(ctx, lastValue, value, targetValue);
          lastTime = t;
          lastValue = value;
          value = next;
          onChange(value);
          if (ctx.settled) task = null;
          return !ctx.settled;
        });
      }
      return task.promise;
    }

    const api = {
      set,
      get value() { return value; },
      get target() { return targetValue; },
      stiffness,
      damping,
      precision,
    };
    return api;
  }

  R.spring = spring;
  R.afterFrame = afterFrame;
  R.frameScheduled = () => inRun || rafId !== null;
})(window.Ribi);
