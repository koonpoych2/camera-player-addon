import { Player, system, world } from "@minecraft/server";
export var Database = class {
  constructor(t) {
    this.tableName = t;
    (this.tableName = t), (this.MEMORY = null), (this.QUEUE = []);
    let e = this.fetch();
    (this.MEMORY = e), this.onLoadCallback?.(e), this.QUEUE.forEach((s) => s());
  }
  resetStorage() {
    let t = world
      .getDynamicPropertyIds()
      .filter((e) => e.startsWith(`db_${this.tableName}`));
    for (let e of t) world.setDynamicProperty(e, void 0);
    world.setDynamicProperty(`db_${this.tableName}`, 0);
  }
  fetch() {
    let t = world.getDynamicProperty(`db_${this.tableName}`) ?? 0;
    if (
      (typeof t != "number" &&
        (console.warn(
          `[DATABASE]: DB: ${this.tableName}, has improper setup! Resetting data.`
        ),
        (t = 0),
        this.resetStorage()),
      t <= 0)
    )
      return {};
    let e = "";
    for (let s = 0; s < t; s++) {
      let a = world.getDynamicProperty(`db_${this.tableName}_${s}`);
      if (typeof a != "string")
        return (
          console.warn(
            `[DATABASE]: When fetching: db_${this.tableName}_${s}, improper data was found.`
          ),
          this.resetStorage(),
          {}
        );
      e += a;
    }
    return JSON.parse(e);
  }
  async addQueueTask() {
    return new Promise((t) => {
      this.QUEUE.push(t);
    });
  }
  async saveData() {
    this.MEMORY || (await this.addQueueTask());
    let t = JSON.stringify(this.MEMORY).match(/.{1,8000}/g);
    if (!t) return;
    world.setDynamicProperty(`db_${this.tableName}`, t.length);
    let e = t.entries();
    for (let [s, a] of e)
      world.setDynamicProperty(`db_${this.tableName}_${s}`, a);
  }
  async onLoad(t) {
    if (this.MEMORY) return t(this.MEMORY);
    this.onLoadCallback = t;
  }
  async set(t, e) {
    if (!this.MEMORY) throw new Error("Data tried to be set before load!");
    return (this.MEMORY[t] = e), this.saveData();
  }
  get(t) {
    if (!this.MEMORY)
      throw new Error("Data not loaded! Consider using `getAsync` instead!");
    return this.MEMORY[t];
  }
  async getSync(t) {
    return this.MEMORY
      ? this.get(t)
      : (await this.addQueueTask(), this.MEMORY ? this.MEMORY[t] : null);
  }
  keys() {
    if (!this.MEMORY)
      throw new Error("Data not loaded! Consider using `keysSync` instead!");
    return Object.keys(this.MEMORY);
  }
  async keysSync() {
    return this.MEMORY
      ? this.keys()
      : (await this.addQueueTask(),
        this.MEMORY ? Object.keys(this.MEMORY) : []);
  }
  values() {
    if (!this.MEMORY)
      throw new Error("Data not loaded! Consider using `valuesSync` instead!");
    return Object.values(this.MEMORY);
  }
  async valuesSync() {
    return this.MEMORY
      ? this.values()
      : (await this.addQueueTask(),
        this.MEMORY ? Object.values(this.MEMORY) : []);
  }
  has(t) {
    if (!this.MEMORY)
      throw new Error("Data not loaded! Consider using `hasSync` instead!");
    return Boolean(this.MEMORY[t]);
  }
  async hasSync(t) {
    return this.MEMORY
      ? this.has(t)
      : (await this.addQueueTask(), this.MEMORY ? Boolean(this.MEMORY[t]) : !1);
  }
  collection() {
    if (!this.MEMORY)
      throw new Error(
        "Data not loaded! Consider using `collectionSync` instead!"
      );
    return this.MEMORY;
  }
  async collectionSync() {
    return this.MEMORY
      ? this.collection()
      : (await this.addQueueTask(), this.MEMORY ? this.MEMORY : {});
  }
  async delete(t) {
    if (!this.MEMORY) return !1;
    let e = delete this.MEMORY[t];
    return await this.saveData(), e;
  }
  async clear() {
    return (this.MEMORY = {}), await this.saveData();
  }
  getKeyByValue(t) {
    for (let e in this.MEMORY) if (this.MEMORY[e] === t) return e;
    return null;
  }
};
var l = { test: new Database("test"), example: new Database("example") };
system.afterEvents.scriptEventReceive.subscribe(
  ({ sourceEntity: i, message: t, id: e }) => {
    if (!(i instanceof Player)) return;
    let s = t.split(" ")[0];
    if (!Object.keys(l).includes(s))
      return i.sendMessage(`\xA7cNo Table with the name ${s} Exists!`);
    let a = t.split(" ")[1],
      d = t.split(" ")[2];
    switch (e) {
      case "database:set":
        l[s].set(a, d),
          i.sendMessage(`Set Key: "${a}", to value: "${d}" on table: "${s}"`);
        break;
      case "database:get":
        let c = l[s].get(a);
        c
          ? i.sendMessage(JSON.stringify(c))
          : i.sendMessage(`\xA7cNo data could be found for key ${a}`);
        break;
      case "database:strain":
        let M = Date.now();
        system.beforeEvents.watchdogTerminate.subscribe((h) => {
          (h.cancel = !0),
            i.sendMessage(
              `\xA7cStrain Failed at: ${~~((Date.now() - M) / 1e3)} Seconds`
            );
        });
        for (let h = 0; h < 1e3; h++) {
          let u = "",
            f = "";
          for (let n = 0; n < 1e3; n++) u += "asdfgh";
          for (let n = 0; n < 100; n++) f += Math.random();
          l[s].set(f, u);
        }
        i.sendMessage(
          `\xA7aCompleted strain in: ${~~((Date.now() - M) / 1e3)} Seconds`
        );
        break;
      default:
        break;
    }
  },
  { namespaces: ["database"] }
);
