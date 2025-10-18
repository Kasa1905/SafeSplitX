// Blockchain-based expense splitting functionality
let users = [];

// Fixed conversion rates relative to USD
const rates = {
    USD: 1,
    EUR: 0.93,
    GBP: 0.81,
    INR: 83.5
};

// Allowed user letters
const allowedUsers = ["a","b","c","d","e","f","g","h","i","j"];

// Initialize blockchain expense splitting functionality
export function initializeBlockchainSplitting() {
    // Step 1: Set number of users
    const setUsersBtn = document.getElementById("set-num-users");
    if (setUsersBtn) {
        setUsersBtn.addEventListener("click", () => {
            const numUsers = parseInt(document.getElementById("num-users").value);
            const usersInputsDiv = document.getElementById("users-inputs");
            usersInputsDiv.innerHTML = "";

            if(!numUsers || numUsers < 1){
                alert("Enter a valid number of users");
                return;
            }

            if(numUsers > 10){
                alert("Maximum 10 users allowed (pretend blockchain has only 10 users)");
                return;
            }

            for(let i=0; i<numUsers; i++){
                const div = document.createElement("div");
                div.innerHTML = `
                    <input type="text" placeholder="User ${i+1} " class="user-name" maxlength="1">
                `;
                usersInputsDiv.appendChild(div);
            }

            document.getElementById("connect-wallets-div").style.display = "block";
        });
    }

    // Step 2: Connect wallets
    const connectWalletsBtn = document.getElementById("connect-wallets-btn");
    if (connectWalletsBtn) {
        connectWalletsBtn.addEventListener("click", () => {
            const names = Array.from(document.getElementsByClassName("user-name")).map(input => input.value.trim().toLowerCase());

            // Validate names
            for(const name of names){
                if(!allowedUsers.includes(name)){
                    alert(`Invalid user name "${name}". Only letters a-j allowed.`);
                    return;
                }
            }

            users = names.map(name => ({name}));
            const walletMsg = document.getElementById("wallet-msg");
            if (walletMsg) {
                walletMsg.textContent = "Users connected successfully!";
            }
            const expenseDiv = document.getElementById("expense-div");
            if (expenseDiv) {
                expenseDiv.style.display = "block";
            }
        });
    }

    // Step 3: Settle Expense in multiple currencies
    const settleExpenseBtn = document.getElementById("settle-expense-btn");
    if (settleExpenseBtn) {
        settleExpenseBtn.addEventListener("click", () => {
            const amount = parseFloat(document.getElementById("expense-amount").value);
            if(!amount || amount <= 0){
                alert("Enter a valid expense amount");
                return;
            }

            const shareUSD = amount / users.length;

            const tbody = document.getElementById("shares-table");
            if (tbody) {
                tbody.innerHTML = "";

                users.forEach(u => {
                    const tr = document.createElement("tr");
                    let rowHTML = `<td>${u.name}</td>`;
                    for (const [cur, rate] of Object.entries(rates)) {
                        rowHTML += `<td>${(shareUSD * rate).toFixed(2)} ${cur}</td>`;
                    }
                    tr.innerHTML = rowHTML;
                    tbody.appendChild(tr);
                });
            }

            const expenseAmountInput = document.getElementById("expense-amount");
            if (expenseAmountInput) {
                expenseAmountInput.value = "";
            }
        });
    }
}

// React-compatible version for use in components
export class BlockchainSplitter {
    constructor() {
        this.users = [];
        this.rates = {
            USD: 1,
            EUR: 0.93,
            GBP: 0.81,
            INR: 83.5
        };
        this.allowedUsers = ["a","b","c","d","e","f","g","h","i","j"];
    }

    validateUsers(names) {
        for(const name of names){
            if(!this.allowedUsers.includes(name.toLowerCase())){
                return { valid: false, error: `Invalid user name "${name}". Only letters a-j allowed.` };
            }
        }
        return { valid: true };
    }

    setUsers(names) {
        const validation = this.validateUsers(names);
        if (!validation.valid) {
            throw new Error(validation.error);
        }
        this.users = names.map(name => ({ name: name.toLowerCase() }));
        return this.users;
    }

    calculateShares(amount) {
        if (!amount || amount <= 0) {
            throw new Error("Enter a valid expense amount");
        }

        if (this.users.length === 0) {
            throw new Error("No users connected");
        }

        const shareUSD = amount / this.users.length;
        
        return this.users.map(user => {
            const shares = {};
            for (const [currency, rate] of Object.entries(this.rates)) {
                shares[currency] = parseFloat((shareUSD * rate).toFixed(2));
            }
            return {
                user: user.name,
                shares
            };
        });
    }

    getSupportedCurrencies() {
        return Object.keys(this.rates);
    }

    getExchangeRate(currency) {
        return this.rates[currency] || null;
    }

    updateExchangeRate(currency, rate) {
        if (rate > 0) {
            this.rates[currency] = rate;
            return true;
        }
        return false;
    }
}

// Export default instance for singleton usage
export const blockchainSplitter = new BlockchainSplitter();

export default {
    initializeBlockchainSplitting,
    BlockchainSplitter,
    blockchainSplitter,
    rates,
    allowedUsers
};