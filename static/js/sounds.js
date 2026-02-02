// Generate simple sound effects using Web Audio API
// This script generates beeps that can be played for habit/task completions

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = localStorage.getItem('soundEnabled') !== 'false';
    }

    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    // Play a success beep (high pitch, short)
    playSuccess() {
        if (!this.enabled) return;
        this.init();
        this.playTone(880, 0.1, 'sine', 0.3);
    }

    // Play a completion sound (two ascending notes)
    playComplete() {
        if (!this.enabled) return;
        this.init();
        this.playTone(523.25, 0.08, 'sine', 0.2); // C5
        setTimeout(() => this.playTone(659.25, 0.12, 'sine', 0.25), 100); // E5
    }

    // Play an undo sound (descending note)
    playUndo() {
        if (!this.enabled) return;
        this.init();
        this.playTone(440, 0.1, 'triangle', 0.2);
    }

    // Play a streak celebration sound (ascending arpeggio)
    playStreak() {
        if (!this.enabled) return;
        this.init();
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.1, 'sine', 0.25), i * 80);
        });
    }

    // Play delete sound (descending two notes - "whoosh down")
    playDelete() {
        if (!this.enabled) return;
        this.init();
        this.playTone(440, 0.08, 'triangle', 0.2); // A4
        setTimeout(() => this.playTone(330, 0.1, 'triangle', 0.15), 80); // E4
    }

    // Play drag start sound (subtle pick up)
    playDrag() {
        if (!this.enabled) return;
        this.init();
        this.playTone(392, 0.05, 'sine', 0.15); // G4
    }

    // Play drop sound (placement confirmation)
    playDrop() {
        if (!this.enabled) return;
        this.init();
        this.playTone(523.25, 0.06, 'sine', 0.18); // C5
    }

    // Play subtle button click
    playClick() {
        if (!this.enabled) return;
        this.init();
        this.playTone(600, 0.03, 'sine', 0.1);
    }

    // Play modal open sound (ascending)
    playOpen() {
        if (!this.enabled) return;
        this.init();
        this.playTone(440, 0.05, 'sine', 0.12);
        setTimeout(() => this.playTone(554.37, 0.06, 'sine', 0.12), 50); // C#5
    }

    // Play modal close sound (descending)
    playClose() {
        if (!this.enabled) return;
        this.init();
        this.playTone(554.37, 0.05, 'sine', 0.12);
        setTimeout(() => this.playTone(440, 0.06, 'sine', 0.1), 50);
    }

    // Play navigation click
    playNav() {
        if (!this.enabled) return;
        this.init();
        this.playTone(698.46, 0.04, 'sine', 0.12); // F5
    }

    // Core tone generator
    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = type;
        oscillator.frequency.value = frequency;

        // Quick attack, smooth decay
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('soundEnabled', this.enabled);
        return this.enabled;
    }

    isEnabled() {
        return this.enabled;
    }
}

// Global sound manager instance
const soundManager = new SoundManager();

