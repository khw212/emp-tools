import { Typography, Switch } from "@material-ui/core";
import styled from "styled-components";
import { useState } from "react";
import { utils } from "ethers";

import EmpState from "../../containers/EmpState";
import Collateral from "../../containers/Collateral";
import EmpSponsors from "../../containers/EmpSponsors";
import PriceFeed from "../../containers/PriceFeed";
import Token from "../../containers/Token";
import { isPricefeedInvertedFromTokenSymbol } from "../../utils/getOffchainPrice";

import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const prettyAddress = (x: string) => {
  return x.substr(0, 4) + "..." + x.substr(x.length - 4, x.length);
};

const CurrentSponsorsCollateralRatio = () => {
  const { empState } = EmpState.useContainer();
  const { priceIdentifier: priceId } = empState;
  const { symbol: collSymbol } = Collateral.useContainer();
  const { activeSponsors } = EmpSponsors.useContainer();
  const { latestPrice } = PriceFeed.useContainer();
  const { symbol } = Token.useContainer();

  const [switchState, setSwitchState] = useState<boolean>(false);

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSwitchState(event.target.checked);
  };

  if (activeSponsors !== null && latestPrice !== null && priceId !== null) {
    const priceIdUtf8 = utils.parseBytes32String(priceId);
    const reformattedSponsorKeys = Object.keys(activeSponsors)
      .filter((sponsor: string) => {
        return (
          activeSponsors[sponsor]?.collateral &&
          activeSponsors[sponsor]?.tokensOutstanding &&
          activeSponsors[sponsor]?.cRatio &&
          activeSponsors[sponsor]?.liquidationPrice
        );
      })
      .sort((sponsorA: string, sponsorB: string) => {
        const fieldValueA = activeSponsors[sponsorA].liquidationPrice;
        const fieldValueB = activeSponsors[sponsorB].liquidationPrice;
        return Number(fieldValueA) > Number(fieldValueB) ? 1 : -1;
      });

    const sponsorArray = reformattedSponsorKeys.map((address) => {
      return {
        address: prettyAddress(address),
        bucket:
          Math.ceil(Number(activeSponsors[address].liquidationPrice) / 5) * 5,
        liquidationPrice: Number(activeSponsors[address].liquidationPrice),
        tokensOutstanding: Number(activeSponsors[address].tokensOutstanding),
        collateral: Number(activeSponsors[address].collateral),
      };
    });

    const invertedPrice = isPricefeedInvertedFromTokenSymbol(symbol);
    const prettyLatestPrice =
      invertedPrice && latestPrice > 0
        ? (1 / latestPrice).toFixed(6)
        : latestPrice.toFixed(6);

    const plotConfig = {
      options: {
        annotations: {
          xaxis: [
            {
              x: Number(prettyLatestPrice),
              borderColor: "#fff",
              label: {
                style: {
                  color: "#434343",
                },
                text: `Current ${priceIdUtf8} Price`,
              },
            },
          ],
        },
        theme: {
          palette: "palette7",
          mode: "dark",
        },
        chart: {
          background: "#303030",
          stacked: true,
          toolbar: {
            show: false,
          },
        },
        xaxis: {
          type: "numeric",
          categories: sponsorArray.map((tokenSponsor) => tokenSponsor.bucket),
          tickAmount: 20,
          min: 100,
          max: Number(prettyLatestPrice) * 1.05,
          title: {
            text: "Liquidation Price",
            offsetY: 15,
          },
        },
        yaxis: {
          logarithmic: switchState,
          title: {
            text: `Position Collateral (${collSymbol})`,
            offsetY: 15,
          },
        },
        plotOptions: {
          bar: {
            columnWidth: "100%",
          },
        },
        dataLabels: {
          enabled: false,
        },
      },
      series: [
        {
          name: `collateral ${collSymbol}`,
          data: sponsorArray.map((tokenSponsor) =>
            tokenSponsor.collateral.toFixed(2)
          ),
        },
      ],
    };

    return (
      <span>
        <Typography variant="h5" style={{ marginBottom: "10px" }}>
          EMP Token Sponsor Liquidation Prices
        </Typography>
        Logarithmic:{" "}
        <Switch checked={switchState} onChange={handleSwitchChange} />
        <Chart
          options={plotConfig.options}
          series={plotConfig.series}
          type="bar"
          height={550}
        />
      </span>
    );
  } else {
    return (
      <span>
        Please first connect and select an EMP from the dropdown above.
      </span>
    );
  }
};

export default CurrentSponsorsCollateralRatio;
