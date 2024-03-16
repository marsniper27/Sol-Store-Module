//fetchWalletAssets.js
const { Connection, PublicKey,
    clusterApiUrl, } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const { Metadata } = require("@metaplex-foundation/mpl-token-metadata");

// Connection to the Solana network
const connection = new Connection(clusterApiUrl(process.env.SOLANA_NETWORK));

async function findTokenDetails(walletAddress) {
    const publicKey = new PublicKey(walletAddress);

    // Fetch all token accounts for the wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID,
    });

    const tokenDetails = await Promise.all(tokenAccounts.value.map(async (account) => {
        const mintAddress = account.account.data.parsed.info.mint;
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
        let tokenMetadata = {};

        try {
            // Fetch and parse the Metadata account for the token's mint address
            const metadataPDA = await Metadata.getPDA(mintAddress);
            const metadataAccount = await Metadata.load(connection, metadataPDA);
            const metadata = metadataAccount.data.data;
            const metadataUri = metadata.uri;
            // Fetch and parse JSON metadata from the URI using the new function
            const metadataJson = await fetchJsonMetadata(metadataUri);
            
            if (metadataJson) {
                tokenMetadata = {
                    name: metadataJson.name,
                    symbol: metadataJson.symbol,
                    image: metadataJson.image, // Adjust based on your JSON structure
                    uri: metadata.uri, // Metadata URI pointing to JSON file with more details
                    // extract other fields as needed
                };
            } else {
                tokenMetadata = {
                    name: metadata.name,
                    symbol: metadata.symbol,
                    image: metadata.uri, // Adjust based on your JSON structure
                    uri: metadata.uri, // Metadata URI pointing to JSON file with more details
                    // Extract more metadata details as needed
                };
            }
        } catch (e) {
            console.error("Failed to fetch metadata for mint:", mintAddress, e);
            // Handle cases where metadata might not be available or accessible
        }

        return {
            mintAddress,
            amount,
            metadata: tokenMetadata,
        };
    }));

    console.log("Token Details:", tokenDetails);
    return tokenDetails;
}

async function fetchJsonMetadata(uri) {
    // Check if the URI ends with ".json"
    if (uri.endsWith('.json')) {
        try {
            const response = await fetch(uri);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${uri}: ${response.statusText}`);
            }
            // Optionally check the content-type header to ensure it's application/json
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new TypeError("Fetched resource is not JSON");
            }
            return await response.json();
        } catch (error) {
            console.error("Error fetching JSON metadata:", error);
            return null; // or handle this case as needed
        }
    } else {
        console.log("URI does not point to a JSON file:", uri);
        return null; // or handle this case as needed
    }
}

module.exports ={ findTokenDetails }
