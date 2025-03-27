// This file is for debugging purposes only
const testQuery = {
  query: `
    query GetTransactions($input: GetTransactionsDTO!) {
      getTransactions(input: $input) {
        items {
          id
          no
          amount
        }
        itemCount
        pageCount
      }
    }
  `,
  variables: {
    input: {
      pageSize: 10,
      pageIndex: 0
    }
  }
};

const testQueryNamedInputType = {
  query: `
    query GetTransactions($input: GetTransactionsInput!) {
      getTransactions(input: $input) {
        items {
          id
          no
          amount
        }
        itemCount
        pageCount
      }
    }
  `,
  variables: {
    input: {
      pageSize: 10,
      pageIndex: 0
    }
  }
};

// Print test queries for manual testing in browser console
console.log("Test query with GetTransactionsDTO:", JSON.stringify(testQuery, null, 2));
console.log("\nTest query with GetTransactionsInput:", JSON.stringify(testQueryNamedInputType, null, 2));

/*
To use these test queries:
1. Copy the JSON output from the console
2. Open browser developer tools on your site
3. Go to Network tab
4. Paste the query in the Fetch/XHR filter
5. Look for the 400 error and examine the response

Alternative using fetch API in console:
fetch('https://recommed.co:4000/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify(testQuery) // or testQueryNamedInputType
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
*/ 