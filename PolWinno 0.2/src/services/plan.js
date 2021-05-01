const {
    normalizeQueryString,
    normalizeQueryString_Create,
    checkDuplicate,
    sqlDate,
    endIsLenghty,
} = require("../utils/commonModules");


require("dotenv").config({
    path: "./utils/.env"
});
const {
    DB_DATABASE
} = process.env;

const ws_loadPlan = async (connection, filters, customQuery = null, resultLimit = 1000) => {
    const {
        pool,
        poolConnect
    } = connection;
    // ensures that the pool has been created
    await poolConnect;
    let queryString = `SELECT TOP (${resultLimit}) [PlanId]
    ,[PlanName]
    ,[Description]
    ,[PlanNature]
    ,[ParentPlanId]
    ,[Icon]
    ,[Fdate]
    ,[Tdate]
    ,[neededLogin]
    FROM [${DB_DATABASE}].[dbo].[tblPlans] WHERE 1 = 1 `;
    queryString = normalizeQueryString(queryString, filters);
    if (customQuery)
        queryString += ` ${customQuery}`
    try {
        const request = pool.request();
        const result = await request.query(queryString);
        return result;
    } catch (err) {
        console.error("SQL error: ", err);
    }
}

const ws_createPlan = async (connection, details) => {
    // details are the parameters sent for creating table

    const {
        PlanName,
        Description,
        PlanNature,
        ParentPlanId,
        Icon,
        Fdate,
        Tdate,
        neededLogin
    } = details;

    // Not Null Values
    if (!PlanName) {
        // Other Not Null Columns that actually have an default values => PlanNature - neededLogin
        return {
            status: "Failed",
            msg: "Fill Parameters Utterly",
            required: ["PlanName", "PlanNature", "neededLogin"],
            details
        }
    }

    // Unique Values
    // check for duplicates - returns: true -> duplicate | false -> unique
    const duplicateUniqueValue = await checkDuplicate(connection, {
        PlanName,
        PlanNature,
        ParentPlanId
    }, ws_loadPlan);
    if (duplicateUniqueValue)
        return {
            status: "Failed",
            msg: "Error Creating Row, Violation of unique values",
            uniqueColumn: "ParentPlanId, PlanNature, PlanName",
            details
        }


    // Date format: YYYY-MM-DD
    // Fdate = Shuru
    // Tdate = Payan
    let start = new sqlDate(Fdate.split('-'));
    let end = new sqlDate(Tdate.split('-'));
    // compare end date and start date - returns: true -> end is bigger or at the same date || false -> start is bigger.
    if (!endIsLenghty(start, end))
        return {
            status: "Failed",
            msg: "ending date must be bigger than initial date",
            start,
            end
        }

    const {
        pool,
        poolConnect
    } = connection;
    // ensures that the pool has been created
    await poolConnect;


    let queryString = `INSERT INTO 
    [${DB_DATABASE}].[dbo].[tblPlans] 
    ($COLUMN) 
    VALUES ($VALUE);
    SELECT SCOPE_IDENTITY() AS planId;`
    // normalizeQS_Create => (queryString, {planName: "sth"}, ...configs)
    // configs are the exceptions that don't have normal values. (need to convert or something to insert into SQL Server)
    // configs = {onColumn: "EXCEPTION COLUMN", prefix="e.g: CONVERT(INT, $1)"}
    queryString = normalizeQueryString_Create(queryString, details, {
        onColumn: "Icon",
        prefix: "CONVERT(varbinary, '$1')"
    })
    try {
        const request = pool.request();
        const result = await request.query(queryString);
        const id = result.recordset[0].planId;
        return id;
    } catch (err) {
        console.error("ws_createPlan error: ", err)
    }

}


const ws_updatePlan = async (connection, filters, newValues) => {
    // note: inputs && parameters -> PlanName, Description, PlanNature, ParentPlanId, icon, Fdate, Tdate, neededLogin, PlanId
    const {
        PlanName,
        PlanNature,
        ParentPlanId,
    } = newValues;
    // Unique Values
    // check for duplicates - returns: true -> duplicate | false -> unique
    // Unique Values => (PlanName, PlanNature, ParentPlanId)
    if (PlanName || PlanNature || ParentPlanId) {
        // check for unique values if they've entered.
        const duplicateUniqueValue = await checkDuplicate(connection, {
            PlanName,
            PlanNature,
            ParentPlanId
        }, ws_loadPlan);
        console.log(duplicateUniqueValue)
        if (duplicateUniqueValue)
            return {
                status: "Failed",
                msg: "Error Updating Row, Violation of unique values",
                uniqueColumn: "ParentPlanId, PlanNature, PlanName",
                newValues
            }
    }
    // if PlanId exists in these table => (tblCashAssistanceDetail, tblNonCashAssistanceDetails) we can not update/change PlanNature Column.
    if ("PlanNature" in newValues) {
        let planIdExist = null;
        if ("PlanId" in filters) {
            let PlanId = filters.PlanId;
            console.log("HI")
            // checkPlanId in cashAssistanceDetails table - returns true -> if planId exists || false -> planId doesn't Exist.
            planIdExist = await checkPlanId_cashAssistanceDetails(connection, PlanId);
            // todo: also check PlanId in nonCashAssistanceDetails table (This table doesn't exists at this point)
        } else {
            // get the PlanId base on the filters object. (load table based on filters object and get their planIds)
            const result = await ws_loadPlan(connection, filters, "ORDER BY PlanId ");
            for (let record of result.recordset){
                // check for duplicates on dependent tables. if it doesn't have any conflicts UPDATE!
                let PlanId = record.PlanId;
                planIdExist = planIdExist || await checkPlanId_cashAssistanceDetails(connection, PlanId);
            }
        }
        if (planIdExist) {
            return {
                status: "Failed",
                msg: "Error Updating Row, Can not change PlanNature due to PlanId depends on cashAssistanceDetail and nonCashAssistanceDetails tables",
                dependencies: ["cashAssistanceDetails", "nonCashAssistanceDetails"],
                PlanNature,
                "PlanId": filters.PlanId
            }
        }
    }

    // todo: if Planid exists in this table => (tblAssignNeedyToPlans) we can not update/change Fdate && Tdate column.


    // todo: ending time must be lenghty er than start time
    // Date format: YYYY-MM-DD
    // Fdate = Shuru
    // Tdate = Payan
    if (newValues.Fdate && newValues.Tdate) {
        // if Fdate and Tdate has been inserted.
        let start = new sqlDate(newValues.Fdate.split('-'));
        let end = new sqlDate(newValues.Tdate.split('-'));
        // compare end date and start date - returns: true -> end is bigger or at the same date || false -> start is bigger.
        if (!endIsLenghty(start, end))
            return {
                status: "Failed",
                msg: "ending date must be bigger than initial date",
                start,
                end
            }
    } else if (newValues.Fdate || newValues.Tdate) {
        return {
            status: "Failed",
            msg: "Send Both Parameters Fdate And Tdate",
            newValues,
            Fdate: newValues.Fdate,
            Tdate: newValues.Tdate,
        }
    }



    let queryString = `UPDATE [${DB_DATABASE}].[dbo].[tblPlans] SET `
    const {
        setToQueryString
    } = require("../utils/commonModules")
    // setToQueryString returns: Update ... SET sth = 2, test = 3
    queryString = setToQueryString(queryString, newValues) + " WHERE 1=1 ";
    queryString = normalizeQueryString(queryString, filters);

    const {
        pool,
        poolConnect
    } = connection;
    // ensures that the pool has been created
    await poolConnect;

    try {
        const request = pool.request();
        const updateResult = await request.query(queryString);
        // return table records
        const table = await ws_loadPlan(connection);
        return table;
    } catch (err) {
        console.error("ws_updatePlan - SQL  error: ", err);
    }
}


const {
    ws_loadCashAssistanceDetail
} = require("./cashAssistanceDetail");
async function checkPlanId_cashAssistanceDetails (connection, PlanId) {
    // check for duplicates - returns: true -> duplicate | false -> unique
    const planIdExist = await checkDuplicate(connection, {
        PlanId
    }, ws_loadCashAssistanceDetail);
    return planIdExist;
}


module.exports = {
    ws_loadPlan,
    ws_createPlan,
    ws_updatePlan,
}