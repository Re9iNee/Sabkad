SELECT SUM(PaymentPrice) as TotalAmount FROM [SabkadV01].[dbo].[tblPayment] WHERE PaymentStatus = 'Successful'