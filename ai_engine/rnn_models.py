"""
BioVault-AI: Recurrent Neural Network (RNN) Foundation Module
Academic Syllabus: Chapter 1 - Sequence Learning, Computational Graphs, RNN Variants & Gradients

Implements:
1. Sequence Learning Formulation
2. Unfolding of Computational Graphs across T discrete time steps
3. Standard Elman RNN & Jordan RNN architectures
4. Bidirectional RNN (BiRNN)
5. Vanishing and Exploding Gradient Analysis with Gradient Clipping
"""

import numpy as np
from typing import Dict, List, Tuple, Any


def sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(x, -30, 30)))


def tanh(x: np.ndarray) -> np.ndarray:
    return np.tanh(x)


class ComputationalGraphUnfolder:
    """
    Visualizes and computes the forward unfolding of a recurrent computational graph.
    Given an input sequence X = [x_1, x_2, ..., x_T], unfolds recurrent state
    transitions across T time steps: h_t = tanh(W_hh * h_{t-1} + W_xh * x_t + b_h).
    """

    def __init__(self, input_dim: int = 6, hidden_dim: int = 16):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        np.random.seed(42)
        self.W_xh = np.random.randn(hidden_dim, input_dim) * 0.1
        self.W_hh = np.random.randn(hidden_dim, hidden_dim) * 0.1
        self.b_h = np.zeros((hidden_dim, 1))

    def unfold_forward(self, sequence: np.ndarray) -> Dict[str, Any]:
        """
        Unfolds computational graph over T time steps.
        :param sequence: Shape (T, input_dim)
        :return: Execution trace showing step-by-step activations and graph nodes.
        """
        T = len(sequence)
        h_prev = np.zeros((self.hidden_dim, 1))
        steps_trace = []
        hidden_states = []

        for t in range(T):
            x_t = sequence[t].reshape(-1, 1)
            # Recurrent linear combination
            linear_sum = np.dot(self.W_xh, x_t) + np.dot(self.W_hh, h_prev) + self.b_h
            h_t = tanh(linear_sum)

            steps_trace.append({
                "time_step": t + 1,
                "input_norm": float(np.linalg.norm(x_t)),
                "hidden_state_norm": float(np.linalg.norm(h_t)),
                "activation_mean": float(np.mean(h_t)),
                "unfolded_node": f"Node_h{t+1} <- tanh(W_xh * x_{t+1} + W_hh * h_{t} + b_h)"
            })

            h_prev = h_t
            hidden_states.append(h_t.flatten())

        return {
            "time_steps_unfolded": T,
            "final_state_norm": float(np.linalg.norm(h_prev)),
            "steps": steps_trace,
            "hidden_states": np.array(hidden_states).tolist()
        }


class ElmanRNN:
    """
    Classic Elman Recurrent Neural Network:
    Hidden state at time t-1 feeds back into hidden state at time t.
    """

    def __init__(self, input_dim: int = 6, hidden_dim: int = 16, output_dim: int = 1):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim

        np.random.seed(42)
        self.W_xh = np.random.randn(hidden_dim, input_dim) * 0.2
        self.W_hh = np.random.randn(hidden_dim, hidden_dim) * 0.2
        self.b_h = np.zeros((hidden_dim, 1))
        self.W_hy = np.random.randn(output_dim, hidden_dim) * 0.2
        self.b_y = np.zeros((output_dim, 1))

    def forward(self, sequence: np.ndarray) -> Tuple[np.ndarray, List[np.ndarray]]:
        T = len(sequence)
        h_t = np.zeros((self.hidden_dim, 1))
        all_h = []

        for t in range(T):
            x_t = sequence[t].reshape(-1, 1)
            h_t = tanh(np.dot(self.W_xh, x_t) + np.dot(self.W_hh, h_t) + self.b_h)
            all_h.append(h_t)

        y = sigmoid(np.dot(self.W_hy, h_t) + self.b_y)
        return y, all_h


class JordanRNN:
    """
    Jordan Recurrent Neural Network:
    Output from previous time step (y_{t-1}) feeds back into the state/context layer.
    """

    def __init__(self, input_dim: int = 6, hidden_dim: int = 16, output_dim: int = 1):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim

        np.random.seed(42)
        self.W_xh = np.random.randn(hidden_dim, input_dim) * 0.2
        self.W_yh = np.random.randn(hidden_dim, output_dim) * 0.2  # Feedback from output
        self.b_h = np.zeros((hidden_dim, 1))
        self.W_hy = np.random.randn(output_dim, hidden_dim) * 0.2
        self.b_y = np.zeros((output_dim, 1))

    def forward(self, sequence: np.ndarray) -> Tuple[np.ndarray, List[np.ndarray]]:
        T = len(sequence)
        y_prev = np.zeros((self.output_dim, 1))
        all_h = []

        for t in range(T):
            x_t = sequence[t].reshape(-1, 1)
            h_t = tanh(np.dot(self.W_xh, x_t) + np.dot(self.W_yh, y_prev) + self.b_h)
            y_t = sigmoid(np.dot(self.W_hy, h_t) + self.b_y)
            y_prev = y_t
            all_h.append(h_t)

        return y_prev, all_h


class BidirectionalRNN:
    """
    Bidirectional Recurrent Neural Network (BiRNN):
    Processes sequence in both forward direction (1 -> T) and backward direction (T -> 1),
    concatenating representations h_t = [h_forward; h_backward] for temporal analysis.
    """

    def __init__(self, input_dim: int = 6, hidden_dim: int = 12, output_dim: int = 1):
        self.hidden_dim = hidden_dim
        self.forward_rnn = ElmanRNN(input_dim, hidden_dim, output_dim)
        self.backward_rnn = ElmanRNN(input_dim, hidden_dim, output_dim)
        self.W_concat = np.random.randn(output_dim, hidden_dim * 2) * 0.1
        self.b_concat = np.zeros((output_dim, 1))

    def forward(self, sequence: np.ndarray) -> Dict[str, Any]:
        _, forward_h = self.forward_rnn.forward(sequence)
        # Invert sequence temporally for backward pass
        reversed_sequence = sequence[::-1]
        _, backward_h_rev = self.backward_rnn.forward(reversed_sequence)
        backward_h = backward_h_rev[::-1]

        # Concatenate forward and backward representations
        concatenated_states = []
        for f_h, b_h in zip(forward_h, backward_h):
            bi_h = np.vstack((f_h, b_h))
            concatenated_states.append(bi_h)

        final_bi_state = concatenated_states[-1]
        logits = np.dot(self.W_concat, final_bi_state) + self.b_concat
        prob = float(sigmoid(logits)[0, 0])

        return {
            "prediction": prob,
            "bidirectional_feature_dim": self.hidden_dim * 2,
            "forward_energy": float(np.linalg.norm(forward_h[-1])),
            "backward_energy": float(np.linalg.norm(backward_h[0]))
        }


class GradientVanishingExplodingAnalyzer:
    """
    Demonstrates mathematically why standard RNNs suffer from vanishing/exploding gradients
    over long sequence horizons T, and how gradient clipping mitigates exploding gradients.
    """

    @staticmethod
    def simulate_gradient_flow(sequence_length: int = 30, spectral_radius: float = 0.8) -> Dict[str, Any]:
        """
        Simulates gradient backpropagation through time across sequence steps.
        If spectral radius rho < 1 -> exponential decay (vanishing gradient).
        If spectral radius rho > 1 -> exponential growth (exploding gradient).
        """
        decay_factors = []
        gradient = 1.0

        for t in range(sequence_length):
            gradient *= spectral_radius
            decay_factors.append(float(gradient))

        status = "Vanishing Gradients" if spectral_radius < 1.0 else "Exploding Gradients"
        return {
            "sequence_length": sequence_length,
            "spectral_radius": spectral_radius,
            "gradient_trajectory": decay_factors,
            "phenomenon": status,
            "mitigation": "Use Gated Architectures (LSTM/GRU) with linear cell carousel and Gradient Clipping."
        }

    @staticmethod
    def clip_gradient(gradient_vector: np.ndarray, threshold: float = 5.0) -> Tuple[np.ndarray, bool]:
        norm = np.linalg.norm(gradient_vector)
        if norm > threshold:
            clipped = gradient_vector * (threshold / norm)
            return clipped, True
        return gradient_vector, False
