export interface MissionState {
  set: number;
  rooftopBest: number;
  deliveries: number;
  pickups: number;
}

export interface MissionGoal {
  label: string;
  current: number;
  target: number;
}

const emptySet = (set: number): MissionState => ({ set, rooftopBest: 0, deliveries: 0, pickups: 0 });

function wholeNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : fallback;
}

function targets(set: number) {
  const difficulty = Math.min(set - 1, 15);
  return {
    rooftopBest: 10 + difficulty * 2,
    deliveries: 1 + Math.floor(difficulty / 4),
    pickups: 50 + difficulty * 10,
  };
}

/** Progress that carries between runs, plus the current run's rooftop count. */
export class Missions {
  state: MissionState;
  revision = 0;
  private runRoofSats = 0;
  private target: ReturnType<typeof targets>;

  constructor(saved?: unknown) {
    const data = (saved && typeof saved === 'object' ? saved : {}) as Partial<MissionState>;
    const set = Math.max(1, wholeNumber(data.set, 1));
    this.state = emptySet(set);
    this.target = targets(set);
    this.state.rooftopBest = Math.min(wholeNumber(data.rooftopBest), this.target.rooftopBest);
    this.state.deliveries = Math.min(wholeNumber(data.deliveries), this.target.deliveries);
    this.state.pickups = Math.min(wholeNumber(data.pickups), this.target.pickups);
  }

  get multiplier() { return Math.min(30, this.state.set); }

  goals(): MissionGoal[] {
    return [
      { label: 'Rooftop sats in one run', current: this.state.rooftopBest, target: this.target.rooftopBest },
      { label: 'Miner deliveries', current: this.state.deliveries, target: this.target.deliveries },
      { label: 'Sats collected', current: this.state.pickups, target: this.target.pickups },
    ];
  }

  beginRun() { this.runRoofSats = 0; }

  pickup(onRack: boolean) {
    let changed = false;
    if (this.state.pickups < this.target.pickups) { this.state.pickups++; changed = true; }
    if (onRack && this.runRoofSats < this.target.rooftopBest) {
      this.runRoofSats++;
      if (this.runRoofSats > this.state.rooftopBest) {
        this.state.rooftopBest = this.runRoofSats;
        changed = true;
      }
    }
    return changed && this.checkSet();
  }

  delivery() {
    if (this.state.deliveries >= this.target.deliveries) return false;
    this.state.deliveries++;
    return this.checkSet();
  }

  private checkSet() {
    this.revision++;
    const { rooftopBest, deliveries, pickups, set } = this.state;
    if (rooftopBest < this.target.rooftopBest || deliveries < this.target.deliveries || pickups < this.target.pickups) return false;
    this.state = emptySet(set + 1);
    this.target = targets(this.state.set);
    this.runRoofSats = 0;
    return true;
  }
}
