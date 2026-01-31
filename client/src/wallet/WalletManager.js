import { ethers } from 'ethers';

export class WalletManager {
    constructor() {
        this.address = null;
        this.provider = null;
        this.signer = null;
        // Game contract / House address - for demo using a random address
        this.houseAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
    }

    async connect() {
        if (typeof window.ethereum === 'undefined') {
            alert('Please install MetaMask to use this app!');
            return null;
        }

        try {
            // Request account access
            this.provider = new ethers.BrowserProvider(window.ethereum);
            this.signer = await this.provider.getSigner();
            this.address = await this.signer.getAddress();

            // Check if we need to add Monad network
            await this.ensureMonadNetwork();

            return this.address;
        } catch (error) {
            console.error('Error connecting wallet:', error);
            return null;
        }
    }

    async ensureMonadNetwork() {
        const monadChainId = '0x279F'; // 10143 in hex (Monad Testnet)

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: monadChainId }],
            });
        } catch (switchError) {
            // Chain not added yet, add it
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: monadChainId,
                            chainName: 'Monad Testnet',
                            nativeCurrency: {
                                name: 'MONAD',
                                symbol: 'MON',
                                decimals: 18
                            },
                            rpcUrls: ['https://testnet-rpc.monad.xyz'],
                            blockExplorerUrls: ['https://testnet.monadexplorer.com']
                        }],
                    });
                } catch (addError) {
                    console.error('Error adding Monad network:', addError);
                }
            }
        }
    }

    async payAmount(amount) {
        if (!this.signer) await this.connect();

        try {
            const tx = await this.signer.sendTransaction({
                to: this.houseAddress,
                value: ethers.parseEther(amount.toString())
            });
            console.log('Transaction sent:', tx.hash);
            // Wait for confirmation
            await tx.wait();
            return { success: true, hash: tx.hash };
        } catch (error) {
            console.error('Payment failed:', error);
            return { success: false, error: error };
        }
    }

    getAddress() {
        return this.address;
    }

    isConnected() {
        return this.address !== null;
    }
    async sendToWinner(winnerAddress, amount) {
        if (!this.signer) await this.connect();

        try {
            const tx = await this.signer.sendTransaction({
                to: winnerAddress,
                value: ethers.parseEther(amount.toString())
            });
            console.log('Payout sent:', tx.hash);
            await tx.wait();
            return { success: true, hash: tx.hash };
        } catch (error) {
            console.error('Payout failed:', error);
            return { success: false, error: error };
        }
    }
}
