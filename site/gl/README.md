# Summary 

A double-entry GL form where user can enter date and then two or more transactions, 
where the debit columns is equal to the credit column.  

By creating an account number for each campsite, we should be able to have a site-level transaction report.  We can bill sites (water leak at 12, etc.) or the entire property.  It give ultimate flexibility with minimal UX.

The layout should be tabular, with an editor appearing in the active row (one row at a time).
Similar to a spreadsheet, the user can tab through the columns and rows but must be mobile first.

# UX

When user clicks "Apply" the current row is added to the transaction records and the input fields are cleared.  The debit/credit column will be updated to to the remaining balance.


# Storage

The data should persist in the cloud, perhaps on the digital ocean server.  The data could be stored in sqlite and I can stand up a light-weight API to serve simple JSON.  The client would only need the secret key to access the service.

# Deploy to Digital Ocean

I will manually deploy the app to Digital Ocean using git and ssh.