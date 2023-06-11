// interface ProgressCounter {
//   avgExecutionTime: number;
//   executionTimes: number[];
//   finishedRuns: number;
//   totalRuns: number;
// }

export class ProgressEstimator  {
  avgExecutionTime: number = 0;
  executionTimes: number[] = [];
  finishedRuns: number = 0;
  totalRuns: number = 0;
  private startTime: number | null = null;

  // Start a new timing measurement
  startMeasurement() {
    this.startTime = Date.now();
  }

  // Stop the current timing measurement and update stats
  stopMeasurement() {
    if (this.startTime === null) {
      throw new Error('No measurement in progress');
    }
    const endTime = Date.now();
    const executionTime = endTime - this.startTime;
    this.executionTimes.push(executionTime);
    this.finishedRuns += 1;
    this.avgExecutionTime =
      this.executionTimes.reduce((a, b) => a + b, 0) / this.finishedRuns;
    this.startTime = null;
  }

  // Reset the entire progress estimator
  reset() {
    this.avgExecutionTime = 0;
    this.executionTimes = [];
    this.finishedRuns = 0;
    this.totalRuns = 0;
    this.startTime = null;
  }

  // Set the total number of runs for progress estimation
  setTotalRuns(totalRuns: number) {
    this.totalRuns = totalRuns;
  }
}
