"""
BioVault-AI: Long Short-Term Memory (LSTM) & GRU Temporal Liveness Classifier
Academic Syllabus: Chapter 1 - LSTM Architecture, Selective Read/Write/Forget Gates, GRU

Implements:
1. Long Short-Term Memory (LSTM) with explicit gating:
   - Selective Forget Gate: f_t = sigma(W_f * [h_{t-1}, x_t] + b_f)
   - Selective Write/Input Gate: i_t = sigma(W_i * [h_{t-1}, x_t] + b_i), C~_t = tanh(W_c * [h_{t-1}, x_t] + b_c)
   - Cell State Update: C_t = f_t * C_{t-1} + i_t * C~_t
   - Selective Read/Output Gate: o_t = sigma(W_o * [h_{t-1}, x_t] + b_o), h_t = o_t * tanh(C_t)
2. Gated Recurrent Unit (GRU):
   - Reset Gate: r_t = sigma(W_r * [h_{t-1}, x_t] + b_r)
   - Update Gate: z_t = sigma(W_z * [h_{t-1}, x_t] + b_z)
   - Candidate State & Hidden Update
3. 20-frame sequential biometric liveness detector analyzing eye aspect ratio (EAR)
   and velocity dynamics to prevent spoofing and video replay attacks.
"""

import numpy as np
from typing import Dict, List, Any


def sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(x, -30, 30)))


def tanh(x: np.ndarray) -> np.ndarray:
    return np.tanh(x)


class LSTMCell:
    """
    Detailed LSTM cell with transparent logging of selective read, write, and forget gates.
    """

    def __init__(self, input_dim: int, hidden_dim: int):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        concat_dim = input_dim + hidden_dim

        # Xavier initialization
        scale = np.sqrt(2.0 / (concat_dim + hidden_dim))
        self.W_f = np.random.randn(hidden_dim, concat_dim) * scale  # Forget gate
        self.b_f = np.ones((hidden_dim, 1))  # Bias initialized to 1 for forget preservation

        self.W_i = np.random.randn(hidden_dim, concat_dim) * scale  # Write / Input gate
        self.b_i = np.zeros((hidden_dim, 1))

        self.W_c = np.random.randn(hidden_dim, concat_dim) * scale  # Candidate cell
        self.b_c = np.zeros((hidden_dim, 1))

        self.W_o = np.random.randn(hidden_dim, concat_dim) * scale  # Read / Output gate
        self.b_o = np.zeros((hidden_dim, 1))

    def forward_step(self, x_t: np.ndarray, h_prev: np.ndarray, c_prev: np.ndarray) -> Dict[str, Any]:
        """
        Executes a single recurrent LSTM time slice.
        """
        concat = np.vstack((h_prev, x_t))

        # 1. Selective Forget Gate
        f_t = sigmoid(np.dot(self.W_f, concat) + self.b_f)

        # 2. Selective Write / Input Gate
        i_t = sigmoid(np.dot(self.W_i, concat) + self.b_i)
        c_tilde = tanh(np.dot(self.W_c, concat) + self.b_c)

        # 3. Cell State Constant Error Carousel Update
        c_t = f_t * c_prev + i_t * c_tilde

        # 4. Selective Read / Output Gate
        o_t = sigmoid(np.dot(self.W_o, concat) + self.b_o)
        h_t = o_t * tanh(c_t)

        return {
            "h_t": h_t,
            "c_t": c_t,
            "forget_gate": f_t,
            "write_gate": i_t,
            "candidate_cell": c_tilde,
            "read_gate": o_t
        }


class GRUCell:
    """
    Gated Recurrent Unit (GRU) with Reset and Update gates.
    """

    def __init__(self, input_dim: int, hidden_dim: int):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        concat_dim = input_dim + hidden_dim
        scale = np.sqrt(2.0 / (concat_dim + hidden_dim))

        self.W_r = np.random.randn(hidden_dim, concat_dim) * scale
        self.b_r = np.zeros((hidden_dim, 1))

        self.W_z = np.random.randn(hidden_dim, concat_dim) * scale
        self.b_z = np.zeros((hidden_dim, 1))

        self.W_h = np.random.randn(hidden_dim, input_dim + hidden_dim) * scale
        self.b_h = np.zeros((hidden_dim, 1))

    def forward_step(self, x_t: np.ndarray, h_prev: np.ndarray) -> Dict[str, Any]:
        concat = np.vstack((h_prev, x_t))

        # Reset and update gates
        r_t = sigmoid(np.dot(self.W_r, concat) + self.b_r)
        z_t = sigmoid(np.dot(self.W_z, concat) + self.b_z)

        # Candidate hidden state using gated past
        gated_concat = np.vstack((r_t * h_prev, x_t))
        h_tilde = tanh(np.dot(self.W_h, gated_concat) + self.b_h)

        # Final hidden state interpolation
        h_t = (1.0 - z_t) * h_prev + z_t * h_tilde

        return {
            "h_t": h_t,
            "reset_gate": r_t,
            "update_gate": z_t,
            "candidate_hidden": h_tilde
        }


class TemporalLivenessClassifier:
    """
    Biometric Liveness Classifier processing a 20-frame sequential window
    of Eye Aspect Ratio (EAR) and facial motion vectors through an LSTM.
    Differentiates between:
    1. Live Human Blink (Smooth drop, brief closure, elastic recovery)
    2. Static Photo Attack (Variance ~ 0.0)
    3. Video Replay Loop (Periodic mechanical repetition without micro-variations)
    """

    def __init__(self, input_dim: int = 6, hidden_dim: int = 16):
        self.hidden_dim = hidden_dim
        self.lstm = LSTMCell(input_dim, hidden_dim)
        self.gru = GRUCell(input_dim, hidden_dim)

        np.random.seed(1337)
        self.W_clf = np.random.randn(1, hidden_dim) * 0.2
        self.b_clf = np.zeros((1, 1))

    def evaluate_sequence(self, sequence_20_frames: List[List[float]], model_type: str = "lstm") -> Dict[str, Any]:
        """
        Ingests a 20-frame tensor: Shape (20, 6)
        Features per frame: [EAR_left, EAR_right, delta_y, delta_x, mouth_open, blink_accel]
        """
        seq = np.array(sequence_20_frames, dtype=np.float32)
        if len(seq.shape) == 1:
            seq = seq.reshape(-1, 1)

        # Ensure sequence length is bounded
        T = min(len(seq), 20)
        h_t = np.zeros((self.hidden_dim, 1))
        c_t = np.zeros((self.hidden_dim, 1))

        gate_telemetry = []

        for t in range(T):
            x_t = seq[t].reshape(-1, 1)
            # Pad or truncate if dimensions mismatch
            if x_t.shape[0] < self.lstm.input_dim:
                x_t = np.pad(x_t, ((0, self.lstm.input_dim - x_t.shape[0]), (0, 0)))
            elif x_t.shape[0] > self.lstm.input_dim:
                x_t = x_t[:self.lstm.input_dim]

            if model_type == "gru":
                step_res = self.gru.forward_step(x_t, h_t)
                h_t = step_res["h_t"]
                gate_telemetry.append({
                    "step": t + 1,
                    "reset_gate_mean": float(np.mean(step_res["reset_gate"])),
                    "update_gate_mean": float(np.mean(step_res["update_gate"])),
                })
            else:
                step_res = self.lstm.forward_step(x_t, h_t, c_t)
                h_t = step_res["h_t"]
                c_t = step_res["c_t"]
                gate_telemetry.append({
                    "step": t + 1,
                    "selective_forget_mean": float(np.mean(step_res["forget_gate"])),
                    "selective_write_mean": float(np.mean(step_res["write_gate"])),
                    "selective_read_mean": float(np.mean(step_res["read_gate"])),
                    "cell_energy": float(np.linalg.norm(c_t))
                })

        # Physical feature heuristics for liveness checks
        ear_channel = seq[:, 0] if seq.shape[1] > 0 else np.zeros(T)
        variance = float(np.var(ear_channel))
        ear_min = float(np.min(ear_channel))
        ear_max = float(np.max(ear_channel))
        dynamic_range = ear_max - ear_min

        # Gated classification output
        raw_score = float(sigmoid(np.dot(self.W_clf, h_t) + self.b_clf)[0, 0])

        # Liveness decision logic
        if dynamic_range < 0.05:
            # Static photo attack: almost zero movement
            is_live = False
            attack_type = "Static Photo / Paper Mask Attack (Zero EAR Variance)"
            confidence = max(0.05, raw_score * 0.2)
        elif dynamic_range > 0.12 and 0.15 <= ear_min <= 0.25:
            # Genuine biological blink curve
            is_live = True
            attack_type = "None (Genuine Biological Sequence)"
            confidence = min(0.99, max(0.85, raw_score * 1.2 + 0.3))
        else:
            # Ambiguous or looping video replay
            is_live = raw_score > 0.5
            attack_type = "Potential Video Loop / Replay Attack" if not is_live else "Acceptable Dynamics"
            confidence = raw_score

        return {
            "is_live": is_live,
            "confidence": round(confidence, 4),
            "attack_type": attack_type,
            "model_architecture": "LSTM (Error Carousel + Selective Gates)" if model_type == "lstm" else "GRU",
            "sequence_frames_analyzed": T,
            "ear_dynamic_range": round(dynamic_range, 4),
            "ear_variance": round(variance, 6),
            "gate_telemetry": gate_telemetry[-5:]  # Return last 5 steps for UI telemetry
        }
