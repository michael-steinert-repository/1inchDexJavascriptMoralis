Moralis.initialize("zIJxtmE2yQbK5ytOdZqbvil5mphCsSclXIZTg1Um");
Moralis.serverURL = "https://kx0rqqxwzeov.moralishost.com:2053/server";

let currentTrade = {};
let currentSelectSide;
let tokens;

const init = async () => {
    /* Initialize all Moralis Plugins */
    await Moralis.initPlugins();
    /* Initialize Moralis Web3 SDK */
    await Moralis.enable();
    /* Getting all available Tokens from 1inch */
    await listAvailableToken();
    currentUser = Moralis.User.current();
    if (currentUser) {
        document.getElementById("swap_button").disabled = false;
    }
}

const listAvailableToken = async () => {
    let htmlParent = document.getElementById("token_list");
    const result = await Moralis.Plugins.oneInch.getSupportedTokens({
        chain: "eth"
    });
    console.log(result)
    tokens = result.tokens;
    /* Special Loop: "tokens" is an Object with Key-Value Pairs */
    for (const address in tokens) {
        /* Getting Object for Token */
        let token = tokens[address];
        let htmlDiv = document.createElement("div");
        htmlDiv.className = "token-row";
        let contentHtml = `
            <img class="token-list-img" src="${token.logoURI}">
            <span class="token-list-text">${token.symbol}</span>
        `;
        htmlDiv.innerHTML = contentHtml;
        htmlDiv.onclick = (() => {
            selectToken(address);
        });
        htmlParent.appendChild(htmlDiv);
    }
}

/* Possible Problem: User have not given 1inch the Allowance to trade his Tokens */
const trySwap = async () => {
    /*
    If Symbol is ETH then it is the FromToken that means a Check for Allowance is not necessary
    because it is always allow for People (it is not a Smart Contract) to send Ether
    */
    let address = Moralis.User.current().get("ethAddress");
    /* Getting the Decimals for each Token */
    let decimals = currentTrade.from.decimals;
    let amount = document.getElementById("from_amount").value;
    amount = amount * (10 ** decimals);
    amount = Number(amount);
    if (currentTrade.from.symbol !== "ETH") {
        /* Checking Allowance from 1inch */
        const allowance = await Moralis.Plugins.oneInch.hasAllowance({
            chain: "eth",
            fromTokenAddress: currentTrade.from.address,
            fromAddress: address,
            amount: amount
        });
        if (allowance) {
            /* Getting Allowance (for 1inch to swap the Amount of Tokens) from User */
            await Moralis.Plugins.oneInch.approve({
                chain: "eth",
                tokenAddress: currentTrade.from.address,
                fromAddress: address
            });
        }
    }
    let receipt = await doSwap(address, amount);
    alert("Swap complete");
}

const doSwap = async (userAddress, amount) => {
    return Moralis.Plugins.oneInch.swap({
        chain: "eth",
        fromTokenAddress: currentTrade.from.address,
        toTokenAddress: currentTrade.to.address,
        amount: amount,
        fromAddress: userAddress,
        slippage: 1
    });
}

const fetchQuote = async () => {
    if (!currentTrade.from || !currentTrade.to || !document.getElementById("from_amount").value) {
        return;
    }
    /* Getting the Decimals for each Token */
    let decimals = currentTrade.from.decimals;
    let amount = document.getElementById("from_amount").value;
    amount = amount * (10 ** decimals);
    amount = Number(amount);
    /* Getting Quote from 1inch */
    const quote = await Moralis.Plugins.oneInch.quote({
        chain: "eth",
        fromTokenAddress: currentTrade.from.address,
        toTokenAddress: currentTrade.to.address,
        amount: amount
    });
    document.getElementById("gas_estimate").innerText = quote.estimatedGas;
    decimals = currentTrade.to.decimals;
    document.getElementById("to_amount").value = (quote.toTokenAmount / 10 ** decimals);
}

const selectToken = async (address) => {
    closeModal();
    currentTrade[currentSelectSide] = tokens[address];
    createInterface();
    await fetchQuote();
}

const createInterface = () => {
    if (currentTrade.from) {
        document.getElementById("from_token_img").src = currentTrade.from.logoURI;
        document.getElementById("from_token_text").innerText = currentTrade.from.symbol;
    }
    if (currentTrade.to) {
        document.getElementById("to_token_img").src = currentTrade.to.logoURI;
        document.getElementById("to_token_text").innerText = currentTrade.to.symbol;
    }
}

const login = async () => {
    try {
        currentUser = Moralis.User.current();
        if (!currentUser) {
            currentUser = await Moralis.Web3.authenticate();
        }
        document.getElementById("swap_button").disabled = false;
    } catch (error) {
        console.log(error);
    }
}

const openModal = (side) => {
    currentSelectSide = side;
    document.getElementById("token_modal").style.display = "block";
}

const closeModal = () => {
    document.getElementById("token_modal").style.display = "none";
}

init();
document.getElementById("login-button").onclick = login;
document.getElementById("from_token_select").onclick = (() => {
    openModal("from");
});
document.getElementById("to_token_select").onclick = (() => {
    openModal("to");
});
document.getElementById("modal_close").onclick = closeModal;
document.getElementById("swap_button").onclick = trySwap;
document.getElementById("from_amount").onblur = fetchQuote;