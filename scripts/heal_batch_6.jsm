const batch6 = [
  {
    date: "2024-05-08",
    description: "May Daily",
    account: 2111,
    amt: -42.51,
  },
  {
    date: "2024-05-18",
    description: "May Daily",
    account: 2129,
    amt: -31.61,
  },
  {
    date: "2024-05-18",
    description: "May Daily",
    account: 2127,
    amt: -31.61,
  },
  {
    date: "2024-05-24",
    description: "May Daily",
    account: 2112,
    amt: -127.53,
  },
  {
    date: "2024-05-24",
    description: "May Daily",
    account: 2119,
    amt: -127.53,
  },
  {
    date: "2024-05-24",
    description: "May Daily",
    account: 2129,
    amt: -63.22,
  },
  {
    date: "2024-05-25",
    description: "May Daily",
    account: 2111,
    amt: -42.51,
  },
  {
    date: "2024-05-26",
    description: "May Daily",
    account: 2111,
    amt: -42.51,
  },
  {
    date: "2024-05-26",
    description: "May Daily",
    account: 1001,
    amt: 1360.78,
  },
  {
    date: "2024-05-31",
    description: "May Daily",
    account: 2111,
    amt: -225,
  },
  {
    date: "2024-05-31",
    description: "May Daily",
    account: 2116,
    amt: -626.75,
  },
  {
    date: "2024-06-19",
    description: "May Tax (Daily)",
    account: 3001,
    amt: 112.36,
  },
  {
    date: "2024-06-19",
    description: "May Tax (Daily)",
    account: 1001,
    amt: -112.36,
  },
];

function round2(value) {
  return Math.round(value * 100) / 100;
}

function injectTax() {
  const taxes = [];
  batch6.forEach((d) => {
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

injectTax();
