const batch1 = [
  {
    date: "2024-01-01",
    description: "2024 Site Deposits",
    account: 2109,
    amt: -200,
  },
  {
    date: "2024-01-01",
    description: "2024 Site Deposits",
    account: 2118,
    amt: -200,
  },
  {
    date: "2024-01-01",
    description: "2024 Site Deposit",
    account: 2121,
    amt: -800,
  },
  {
    date: "2024-01-01",
    description: "2024 Site Deposit",
    account: 2125,
    amt: -200,
  },
  {
    date: "2024-01-01",
    description: "2024 Site Deposit",
    account: 1001,
    amt: 1400,
  },
  {
    date: "2024-05-03",
    description: "2024 Site Deposit",
    account: 2102,
    amt: -1200,
  },
  {
    date: "2024-06-08",
    description: "2024 Site Deposit",
    account: 2103,
    amt: -200,
  },
  {
    date: "2024-06-08",
    description: "2024 Site Deposit",
    account: 2105,
    amt: -1800,
  },
  {
    date: "2024-06-08",
    description: "2024 Site Deposit",
    account: 2104,
    amt: -1800,
  },
  {
    date: "2024-06-02",
    description: "2024 Site Deposit",
    account: 2107,
    amt: -1800,
  },
  {
    date: "2024-05-24",
    description: "2024 Site Deposit",
    account: 2108,
    amt: -1800,
  },
  {
    date: "2024-05-11",
    description: "2024 Site Deposit",
    account: 2110,
    amt: -500,
  },
  {
    date: "2024-05-04",
    description: "2024 Site Deposit",
    account: 2114,
    amt: -500,
  },
  {
    date: "2024-05-16",
    description: "2024 Site Deposit",
    account: 2117,
    amt: -1800,
  },
  {
    date: "2024-05-26",
    description: "2024 Site Deposit",
    account: 2120,
    amt: -900,
  },
  {
    date: "2024-05-03",
    description: "2024 Site Deposit",
    account: 2122,
    amt: -1800,
  },
  {
    date: "2024-06-03",
    description: "2024 Site Deposit",
    account: 2123,
    amt: -1600,
  },
  {
    date: "2024-05-26",
    description: "2024 Site Deposit",
    account: 2124,
    amt: -1800,
  },
  {
    date: "2024-05-04",
    description: "2024 Site Deposit",
    account: 2128,
    amt: -300,
  },
  {
    date: "2024-06-01",
    description: "2024 Site Deposit",
    account: 2113,
    amt: -1000,
  },
  {
    date: "2024-06-09",
    description: "2024 Site Deposit",
    account: 2103,
    amt: -300,
  },
  {
    date: "2024-05-03",
    description: "2024 Site Deposit",
    account: 2109,
    amt: -900,
  },
  {
    date: "2024-06-01",
    description: "2024 Site Deposit",
    account: 2110,
    amt: -500,
  },
  {
    date: "2024-06-11",
    description: "2024 Site Deposit",
    account: 2114,
    amt: -500,
  },
  {
    date: "2024-05-25",
    description: "2024 Site Deposit",
    account: 2118,
    amt: -450,
  },
  {
    date: "2024-05-15",
    description: "2024 Site Deposit",
    account: 2121,
    amt: -200,
  },
  {
    date: "2024-06-06",
    description: "2024 Site Deposit",
    account: 2123,
    amt: -200,
  },
  {
    date: "2024-05-03",
    description: "2024 Site Deposit",
    account: 2125,
    amt: -1600,
  },
  {
    date: "2024-02-03",
    description: "2024 Site Deposit",
    account: 2128,
    amt: -300,
  },
  {
    date: "2024-05-31",
    description: "2024 Site Deposit",
    account: 2109,
    amt: -500,
  },
  {
    date: "2024-06-11",
    description: "2024 Site Deposit",
    account: 2121,
    amt: -200,
  },
  {
    date: "2024-06-14",
    description: "2024 Site Deposit",
    account: 2109,
    amt: -200,
  },
  {
    date: "2024-04-28",
    description: "2024 Site Deposit",
    account: 2126,
    amt: -1800,
  },
  {
    date: "2024-06-18",
    description: "2024 Site Deposit",
    account: 1001,
    amt: 26450,
  },
];

function round2(value) {
  return Math.round(value * 100) / 100;
}

function injectTax(batch) {
  const taxes = [];
  batch.forEach((d) => {
    taxes.push(d);
    if (d.account >= 2100 && d.account < 2200) {
      const net = round2(d.amt / 1.09);
      const tax = round2(net * 0.09);
      d.amt = net;
      taxes.push({
        date: d.date,
        description: `${d.description} Tax`,
        account: 3001,
        amt: tax,
      });
    }
  });

  console.log(JSON.stringify(taxes, null, " "));
}

injectTax(batch1);
