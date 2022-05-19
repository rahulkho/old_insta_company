import createError from 'http-errors';
import NodeRSA from 'node-rsa';
import _ from 'lodash';
//import getDistance from 'geolib/es/getDistance';
import Geopoint from 'geopoint';
import buckets from '../../lib/buckets';
import db from '../../db';
import ApiResponse from '../../classes/ApiResponse';
import Responses from '../../lib/api_response';
import { compareVersions } from '../../lib/compare_versions';
import utils from '../../lib/utils';

if (typeof Number.prototype.toRad === 'undefined') {
  Number.prototype.toRad = function () {
    return (this * Math.PI) / 180;
  };
}

const FifteenDaysInMillis = 15 * 24 * 60 * 60 * 1000;

const getDistance = function (start, end, decimals) {
  const point1 = new Geopoint(start.latitude, start.longitude);
  const point2 = new Geopoint(end.latitude, end.longitude);
  return point1.distanceTo(point2);
};

const hasResult = (rows) => {
  return rows && rows.length >= 1;
};

const hasValue = (thing) => {
  return thing && (thing.length || !isNaN(parseInt(thing)));
};

const responseCodes = async (req, res, next) => {
  return res.send(Responses);
};

const license = async (req, res, next) => {
  try {
    const rows = await db('general_info').where('type', 'license');
    if (!hasResult(rows)) {
      return next(createError(401, 'Invalid request'));
    }
    res.send(new ApiResponse('Success', rows.pop()).response);
  } catch (error) {
    console.log(`[general] error: ${error.stack} `);
    next(createError(401, 'Invalid request'));
  }
};

const terms = async (req, res, next) => {
  try {
    const rows = await db('general_info').where('type', 'terms');
    if (!hasResult(rows)) {
      return next(createError(401, 'Invalid request'));
    }
    res.send(new ApiResponse('Success', rows.pop()).response);
  } catch (error) {
    console.log(`[general] error: ${error.stack} `);
    next(createError(401, 'Invalid request'));
  }
};

const privacyPolicy = async (req, res, next) => {
  try {
    const rows = await db('general_info').where('type', 'privacyPolicy');
    if (!hasResult(rows)) {
      return next(createError(401, 'Invalid request'));
    }
    res.send(new ApiResponse('Success', rows.pop()).response);
  } catch (error) {
    console.log(`[general] error: ${error.stack} `);
    next(createError(401, 'Invalid request'));
  }
};

const appSettings = async (req, res, next) => {
  try {
    const body = req.body;
    console.log(`[appSettings] body: ${JSON.stringify(body)}`);
    if (!hasValue(body.platform) || !hasValue(body.version)) {
      return next(
        createError(
          401,
          'Server is busy at the moment, please try again later.'
        )
      );
    }
    const rows = await db('app_versions').where(
      'platform',
      body.platform.toLowerCase()
    );
    const currentApp = rows.pop();
    const count = await db('notifications')
      .count('*')
      .where('userId', req.user.userId)
      .andWhere('isRead', false);

    const numCategories = await db('categories')
      .count('*')
      .where('isDeleted', false);
    const badge = count[0].count;
    const categoryCount = numCategories[0].count;
    const subcategories = await db('subcategories')
      .select('*')
      .orderBy('id', 'desc');
    let response = {
      badge: parseInt(badge),
      platform: currentApp.platform,
      currentVersion: currentApp.version,
      categoryCount: parseInt(categoryCount),
      subcategories,
    };

    const comparison = compareVersions(currentApp.version, body.version);
    console.log(
      `[appSettings] compareVersions('${currentApp.version}', '${body.version}'): ${comparison}`
    );
    //if (currentApp.version !== body.version) {
    if (comparison > 0) {
      response.forcedUpdate = currentApp.forcedUpdate;
      response.optionalUpdate = !currentApp.forcedUpdate;
    } else {
      response.forcedUpdate = false;
      response.optionalUpdate = false;
    }

    if (body.userId) {
      let locationData = (
        await db('user_location_info')
          .select(['latitude', 'longitude', 'ts'])
          .where({ userId: body.userId })
      ).pop();

      if (locationData) {
        const diff = new Date().getTime() - new Date(locationData.ts).getTime();
        if (diff > FifteenDaysInMillis) {
          let newLocationData = await utils.getIpAddrInfo(
            body.userId,
            req.clientIp
          );

          if (
            newLocationData &&
            newLocationData.latitude &&
            newLocationData.longitude
          ) {
            locationData = newLocationData;
          }
        }

        let nearest,
          nearestIndex = 0;
        let regions = JSON.parse(JSON.stringify(buckets));
        for (let i = 0; i < regions.length; i++) {
          regions[i].distance = getDistance(
            { latitude: regions[i].lat, longitude: regions[i].lon },
            {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
            }
          );
          if (!nearest || regions[i].distance < nearest) {
            nearest = regions[i].distance;
            nearestIndex = i;
          }
        }

        let user = (
          await db('users').select(['publicKey']).where('userId', body.userId)
        ).pop();
        response.bucket = regions[nearestIndex];
        if (user && user.publicKey && user.publicKey.length) {
          const awsKeys = {
            AWS_ACCESS_KEY: process.env.S3_ACCESS_KEY,
            AWS_SECRET_KEY: process.env.S3_ACCESS_KEY_SECRET,
          };

          user.publicKey = user.publicKey + '\n';
          try {
            const key = new NodeRSA(
              '-----BEGIN PUBLIC KEY-----\n' +
                user.publicKey +
                '-----END PUBLIC KEY-----'
            );

            key.setOptions({
              encryptionScheme: {
                scheme: 'pkcs1',
              },
            });

            const encrypted = key.encrypt(JSON.stringify(awsKeys), 'base64');
            response.bucket.keys = encrypted;
          } catch (error) {
            response.bucket.keys = null;
            console.log(`[appSetting] ${error.stack} `);
          }
          // key.encrypt(
          //   JSON.stringify(keys),
          //   'base64'
          // );
        }
      }
    }
    res.send(new ApiResponse('Success', response).response);
  } catch (err) {
    console.log(`[appSetting] error: ${err.stack} `);
    next(createError(401, 'Invalid request'));
  }
};

const legal = async (req, res, next) => {
  try {
    const { appName, bundleId, appVersion, info } = req.body;
    await db('legal')
      .insert({ appName, appVersion, bundleId, info })
      .returning('*');
    res.send(new ApiResponse('Success').response);
  } catch (error) {
    console.log(`[legal] error: ${error.stack} `);
    next(createError(401, 'Invalid request'));
  }
};

export default {
  license,
  terms,
  privacyPolicy,
  responseCodes,
  appSettings,
  legal,
};
