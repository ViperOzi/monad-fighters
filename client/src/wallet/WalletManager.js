export class WalletManager {
    constructor() {
        this.address = null;
        this.provider = null;
        this.signer = null;
    }

    async connect() {
        if (typeof window.ethereum === 'undefined') {
            alert('Please install MetaMask to use this app!');
            return null;
        }

        try {
            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            this.address = accounts[0];

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

    getAddress() {
        return this.address;
    }

    isConnected() {
        return this.address !== null;
    }
}
