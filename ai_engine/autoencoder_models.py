"""
BioVault-AI: Autoencoders & Representation Learning Module
Academic Syllabus: Unit V - Autoencoders
Includes:
- Architecture of autoencoder (Encoder, Bottleneck, Decoder)
- Types of Autoencoders:
  1. Convolutional Autoencoder (CAE)
  2. Variational Autoencoders (VAE) with Reparameterization Trick (mu + sigma * epsilon)
  3. Denoising Autoencoders (DAE) with Gaussian noise injection
  4. Deep Autoencoders with Regularization (L1 Sparsity, Weight Decay)
- Application: Image Compression via Latent Quantization
"""

import numpy as np
from typing import Dict, Tuple, Any, List


def relu(x: np.ndarray) -> np.ndarray:
    return np.maximum(0, x)


def sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(x, -30, 30)))


class DeepAutoencoder:
    """
    Deep Autoencoder with multi-layer symmetric bottleneck and L1/L2 regularization.
    Architecture: Input -> Hidden1 -> Latent Bottleneck -> Hidden1_Dec -> Reconstruction
    """

    def __init__(self, input_dim: int = 16, hidden_dim: int = 8, latent_dim: int = 3, l1_reg: float = 1e-4):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.latent_dim = latent_dim
        self.l1_reg = l1_reg

        np.random.seed(42)
        # Encoder weights
        self.W_enc1 = np.random.randn(hidden_dim, input_dim) * np.sqrt(2.0 / input_dim)
        self.b_enc1 = np.zeros((hidden_dim, 1))
        self.W_latent = np.random.randn(latent_dim, hidden_dim) * np.sqrt(2.0 / hidden_dim)
        self.b_latent = np.zeros((latent_dim, 1))

        # Symmetrical Decoder weights
        self.W_dec1 = np.random.randn(hidden_dim, latent_dim) * np.sqrt(2.0 / latent_dim)
        self.b_dec1 = np.zeros((hidden_dim, 1))
        self.W_rec = np.random.randn(input_dim, hidden_dim) * np.sqrt(2.0 / hidden_dim)
        self.b_rec = np.zeros((input_dim, 1))

    def encode(self, x: np.ndarray) -> np.ndarray:
        h1 = relu(np.dot(self.W_enc1, x) + self.b_enc1)
        z = np.dot(self.W_latent, h1) + self.b_latent  # Latent representation
        return z

    def decode(self, z: np.ndarray) -> np.ndarray:
        h1_dec = relu(np.dot(self.W_dec1, z) + self.b_dec1)
        x_rec = sigmoid(np.dot(self.W_rec, h1_dec) + self.b_rec)
        return x_rec

    def forward(self, x: np.ndarray) -> Tuple[np.ndarray, np.ndarray, float]:
        x_col = x.reshape(-1, 1)
        z = self.encode(x_col)
        x_rec = self.decode(z)

        # Reconstruction Mean Squared Error (MSE)
        mse_loss = float(np.mean((x_col - x_rec) ** 2))
        # L1 Sparsity regularization on latent representations
        sparsity_loss = float(self.l1_reg * np.sum(np.abs(z)))
        total_loss = mse_loss + sparsity_loss

        return z.flatten(), x_rec.flatten(), total_loss


class DenoisingAutoencoder:
    """
    Denoising Autoencoder (DAE): Injects stochastic noise into the input
    and forces the network to learn invariant manifold geometry by reconstructing the clean target.
    """

    def __init__(self, input_dim: int = 16, latent_dim: int = 4, noise_factor: float = 0.25):
        self.input_dim = input_dim
        self.latent_dim = latent_dim
        self.noise_factor = noise_factor
        self.ae = DeepAutoencoder(input_dim=input_dim, hidden_dim=8, latent_dim=latent_dim)

    def denoise(self, clean_input: np.ndarray) -> Dict[str, Any]:
        clean = np.array(clean_input, dtype=np.float32)
        # Inject Gaussian Noise: x_tilde = x + N(0, sigma^2)
        noise = np.random.normal(loc=0.0, scale=self.noise_factor, size=clean.shape)
        noisy_input = np.clip(clean + noise, 0.0, 1.0)

        # Pass noisy input through the autoencoder
        z, reconstructed, loss = self.ae.forward(noisy_input)

        # Quality metric: Peak Signal-to-Noise Ratio (PSNR)
        mse = np.mean((clean - reconstructed) ** 2)
        psnr = float(10 * np.log10(1.0 / (mse + 1e-10)))

        return {
            "clean_sample": clean[:6].tolist(),
            "noisy_sample": noisy_input[:6].tolist(),
            "reconstructed_sample": reconstructed[:6].tolist(),
            "latent_code": z.tolist(),
            "noise_variance": float(np.var(noise)),
            "psnr_db": round(psnr, 2),
            "reconstruction_loss": round(loss, 6)
        }


class VariationalAutoencoder:
    """
    Variational Autoencoder (VAE):
    Maps input data to a latent probability distribution: q(z | x) ~ N(mu, diag(sigma^2)).
    Uses the Reparameterization Trick: z = mu + sigma * epsilon, epsilon ~ N(0, I).
    Minimizes Reconstruction Loss + KL Divergence.
    """

    def __init__(self, input_dim: int = 16, latent_dim: int = 3):
        self.input_dim = input_dim
        self.latent_dim = latent_dim
        np.random.seed(101)

        # Encoder shared
        self.W_enc = np.random.randn(8, input_dim) * 0.2
        self.b_enc = np.zeros((8, 1))

        # Latent heads: Mean and Log-Variance
        self.W_mu = np.random.randn(latent_dim, 8) * 0.2
        self.b_mu = np.zeros((latent_dim, 1))
        self.W_logvar = np.random.randn(latent_dim, 8) * 0.2
        self.b_logvar = np.zeros((latent_dim, 1))

        # Decoder
        self.W_dec = np.random.randn(input_dim, latent_dim) * 0.2
        self.b_dec = np.zeros((input_dim, 1))

    def reparameterize(self, mu: np.ndarray, logvar: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        The Reparameterization Trick: z = mu + exp(0.5 * logvar) * epsilon
        Allows backpropagation through stochastic sampling.
        """
        std = np.exp(0.5 * logvar)
        eps = np.random.randn(*mu.shape)
        z = mu + std * eps
        return z, eps

    def forward(self, x: np.ndarray) -> Dict[str, Any]:
        x_col = x.reshape(-1, 1)
        h = relu(np.dot(self.W_enc, x_col) + self.b_enc)

        mu = np.dot(self.W_mu, h) + self.b_mu
        logvar = np.dot(self.W_logvar, h) + self.b_logvar
        z, eps = self.reparameterize(mu, logvar)

        # Reconstruction
        x_rec = sigmoid(np.dot(self.W_dec, z) + self.b_dec)

        # KL Divergence Loss: D_KL(q(z|x) || p(z))
        kl_div = -0.5 * np.sum(1 + logvar - mu ** 2 - np.exp(logvar))
        rec_loss = np.sum((x_col - x_rec) ** 2)

        return {
            "latent_mu": mu.flatten().tolist(),
            "latent_logvar": logvar.flatten().tolist(),
            "sampled_z": z.flatten().tolist(),
            "reconstruction_loss": float(rec_loss),
            "kl_divergence": float(kl_div),
            "total_elbo_loss": float(rec_loss + kl_div)
        }


class ImageCompressionAutoencoder:
    """
    Application of Autoencoders: Image & Facial Biometric Compression.
    Compresses high-dimensional feature vectors into an integer-quantized 8-bit bottleneck,
    measuring compression ratio and retention fidelity.
    """

    def __init__(self, raw_dim: int = 128, compressed_dim: int = 16):
        self.raw_dim = raw_dim
        self.compressed_dim = compressed_dim
        np.random.seed(99)
        self.W_compress = np.random.randn(compressed_dim, raw_dim) * 0.1
        self.W_decompress = np.random.randn(raw_dim, compressed_dim) * 0.1

    def compress(self, embedding_vector: np.ndarray) -> Dict[str, Any]:
        vec = np.array(embedding_vector).reshape(-1, 1)
        if len(vec) != self.raw_dim:
            # Resize / interpolate to expected raw_dim
            vec = np.resize(vec, (self.raw_dim, 1))

        # Latent projection
        continuous_latent = np.dot(self.W_compress, vec)
        # 8-bit Quantization (0 to 255)
        quantized_bytes = np.clip(np.round((continuous_latent + 2.0) / 4.0 * 255), 0, 255).astype(np.uint8)

        # Dequantization and Reconstruction
        dequantized = (quantized_bytes.astype(np.float32) / 255.0 * 4.0) - 2.0
        reconstructed = np.dot(self.W_decompress, dequantized)

        # Calculate metrics
        raw_bytes = self.raw_dim * 4  # 32-bit floats
        comp_bytes = self.compressed_dim * 1  # 8-bit ints
        compression_ratio = raw_bytes / comp_bytes
        fidelity = float(1.0 - (np.linalg.norm(vec - reconstructed) / (np.linalg.norm(vec) + 1e-8)))

        return {
            "original_dimension": self.raw_dim,
            "compressed_dimension": self.compressed_dim,
            "raw_size_bytes": raw_bytes,
            "compressed_size_bytes": comp_bytes,
            "compression_ratio": f"{compression_ratio:.1f}x",
            "storage_savings_percent": round((1.0 - comp_bytes / raw_bytes) * 100, 1),
            "reconstruction_fidelity": max(0.0, round(fidelity, 4)),
            "quantized_token": quantized_bytes.flatten().tolist()
        }
