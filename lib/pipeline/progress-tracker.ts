/**
 * Progress Tracker Utility
 * 
 * Provides real-time progress tracking with:
 * - Progress bars
 * - ETA calculation
 * - Items/sec rate
 * - Timeout warnings
 * - User interruption prompts
 */

import chalk from 'chalk';
import readline from 'readline';

export interface ProgressOptions {
  total: number;
  label: string;
  timeoutMinutes?: number; // Warn user after this many minutes
  barWidth?: number;
}

export interface ProgressStats {
  current: number;
  total: number;
  startTime: number;
  elapsed: number;
  rate: number; // items per second
  eta: number; // seconds remaining
}

export class ProgressTracker {
  private current: number = 0;
  private total: number;
  private label: string;
  private startTime: number;
  private lastUpdate: number = 0;
  private timeoutMinutes: number;
  private barWidth: number;
  private hasWarned: boolean = false;
  private shouldStop: boolean = false;

  constructor(options: ProgressOptions) {
    this.total = options.total;
    this.label = options.label;
    this.timeoutMinutes = options.timeoutMinutes || 5;
    this.barWidth = options.barWidth || 40;
    this.startTime = Date.now();
  }

  /**
   * Increment progress by 1
   */
  increment(): void {
    this.current++;
    this.render();
  }

  /**
   * Set current progress
   */
  set(current: number): void {
    this.current = current;
    this.render();
  }

  /**
   * Get current stats
   */
  getStats(): ProgressStats {
    const now = Date.now();
    const elapsed = (now - this.startTime) / 1000; // seconds
    const rate = this.current / Math.max(elapsed, 0.1);
    const remaining = this.total - this.current;
    const eta = remaining / Math.max(rate, 0.001);

    return {
      current: this.current,
      total: this.total,
      startTime: this.startTime,
      elapsed,
      rate,
      eta,
    };
  }

  /**
   * Check if timeout has elapsed and prompt user
   */
  async checkTimeout(): Promise<'continue' | 'skip' | 'stop'> {
    const stats = this.getStats();
    const elapsedMinutes = stats.elapsed / 60;

    if (elapsedMinutes >= this.timeoutMinutes && !this.hasWarned) {
      this.hasWarned = true;
      console.log(chalk.yellow(`\n⏱️  ${this.timeoutMinutes} minutes elapsed. Progress: ${this.current}/${this.total}`));
      
      const response = await this.promptUser();
      return response;
    }

    return 'continue';
  }

  /**
   * Prompt user for action
   */
  private async promptUser(): Promise<'continue' | 'skip' | 'stop'> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(
        chalk.cyan('Continue? (y=continue / s=skip this step / n=stop): '),
        (answer) => {
          rl.close();
          const normalized = answer.toLowerCase().trim();
          
          if (normalized === 'n' || normalized === 'no') {
            resolve('stop');
          } else if (normalized === 's' || normalized === 'skip') {
            resolve('skip');
          } else {
            resolve('continue');
          }
        }
      );

      // Auto-continue after 30 seconds of no response
      setTimeout(() => {
        rl.close();
        console.log(chalk.gray('\nNo response - continuing automatically...'));
        resolve('continue');
      }, 30000);
    });
  }

  /**
   * Render progress bar
   */
  private render(): void {
    const now = Date.now();
    
    // Throttle updates to every 100ms
    if (now - this.lastUpdate < 100) {
      return;
    }
    this.lastUpdate = now;

    const stats = this.getStats();
    const percent = Math.min(100, (this.current / this.total) * 100);
    const filled = Math.floor((percent / 100) * this.barWidth);
    const empty = this.barWidth - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const percentStr = percent.toFixed(1).padStart(5);
    const rateStr = stats.rate.toFixed(1).padStart(5);
    const etaStr = this.formatTime(stats.eta);
    const elapsedStr = this.formatTime(stats.elapsed);

    // Clear line and write progress
    process.stdout.write('\r\x1b[K');
    process.stdout.write(
      `${chalk.cyan(this.label)}: [${bar}] ${percentStr}% | ` +
      `${chalk.green(`${this.current}/${this.total}`)} | ` +
      `${chalk.yellow(`${rateStr} items/s`)} | ` +
      `ETA: ${chalk.blue(etaStr)} | ` +
      `Elapsed: ${chalk.gray(elapsedStr)}`
    );
  }

  /**
   * Format seconds into human readable time
   */
  private formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) {
      return '--:--';
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    if (mins > 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins}m`;
    }

    return `${mins}m ${secs}s`;
  }

  /**
   * Complete the progress bar
   */
  complete(message?: string): void {
    this.current = this.total;
    this.render();
    console.log(); // New line after progress bar
    
    if (message) {
      console.log(chalk.green(`✓ ${message}`));
    }
  }

  /**
   * Fail the progress bar
   */
  fail(error: string): void {
    console.log(); // New line after progress bar
    console.log(chalk.red(`✗ ${error}`));
  }
}

/**
 * Create a simple progress tracker for batches
 */
export function createBatchProgress(label: string, totalBatches: number): ProgressTracker {
  return new ProgressTracker({
    total: totalBatches,
    label,
    timeoutMinutes: 5,
    barWidth: 30,
  });
}

/**
 * Create a progress tracker with custom timeout
 */
export function createProgress(label: string, total: number, timeoutMinutes: number = 5): ProgressTracker {
  return new ProgressTracker({
    total,
    label,
    timeoutMinutes,
    barWidth: 40,
  });
}

