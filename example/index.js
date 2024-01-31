require('dotenv').config();
const ddbGeo = require('dynamodb-geo');
const AWS = require('aws-sdk');
const uuid = require('uuid');

// Set up AWS
AWS.config.update({
    accessKeyId: process.env.AWS_KEY_ID || YOUR_AWS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || YOUR_AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || YOUR_AWS_REGION
});

// Use a local DB for the example.
const ddb = new AWS.DynamoDB({ endpoint: new AWS.Endpoint('http://localhost:8000') });

// Configuration for a new instance of a GeoDataManager. Each GeoDataManager instance represents a table
const config = new ddbGeo.GeoDataManagerConfiguration(ddb, 'capitals');

// Instantiate the table manager
const capitalsManager = new ddbGeo.GeoDataManager(config);

// Use GeoTableUtil to help construct a CreateTableInput.
const createTableInput = ddbGeo.GeoTableUtil.getCreateTableRequest(config);

// Tweak the schema as desired
createTableInput.ProvisionedThroughput.ReadCapacityUnits = 2;

const data = require('./capitals.json');
async function exampleGeoHash(){
    try {
        await ddb.createTable(createTableInput).promise();
        await ddb.waitFor('tableExists', { TableName: config.tableName }).promise();
        console.log('Table created and ready!');
    } catch (error) {
        console.error('Error creating table:', error);
    }

    const putPointAsync = async (capital) => {
        const RangeKeyValue = { S: uuid.v4() };
        const GeoPoint = { latitude: capital.latitude, longitude: capital.longitude };
        const PutItemInput = {
            Item: {
                country: { S: capital.country },
                capital: { S: capital.capital }
            },
        };
    
        try {
            await capitalsManager.putPoint({ RangeKeyValue, GeoPoint, PutItemInput }).promise();
            console.log(`Successfully added point for ${capital.capital}, ${capital.country}`);
        } catch (error) {
            console.error(`Error adding point for ${capital.capital}, ${capital.country}:`, error);
        }
    };

    await Promise.all(data.map(capital => putPointAsync(capital)));

    const queryRadius = await capitalsManager.queryRadius({
        RadiusInMeter: 100000,
        CenterPoint: {
            latitude: 52.502696567803966,
            longitude: 13.395568637019005
        }
    })
    console.log(queryRadius)

    const queryRectangle = await capitalsManager.queryRectangle({
        MinPoint: {
            latitude: 52.519713,
            longitude: 13.409506
        },
        MaxPoint: {
            latitude: 52.520408,
            longitude: 13.410539
        }
    })
    console.log(queryRectangle)
}

exampleGeoHash()