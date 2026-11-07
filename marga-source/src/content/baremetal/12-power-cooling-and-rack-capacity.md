---
title: Power, cooling and rack capacity planning
minutes: 12
summary: Plan rack power in watts and amps, understand redundant feeds and cooling limits, and place servers without tripping breakers.
---

You can fill a rack with servers and still be unable to power or cool them. Good operators plan in kilowatts and airflow, keep redundancy honest and watch the real numbers from the power distribution units.

## What you will learn

- Reading watts, amps and power factor for a rack
- Redundant A and B feeds and the 80 percent rule
- Airflow, inlet temperature and hot spots
- Tracking stranded and available capacity

## Power budget

Estimate from **measured** draw at typical and peak load, not from the label on the power supply. Convert: watts divided by voltage gives amps, so a 7 kW rack on 230 V draws about 30 A. Breakers should not run continuously above about 80 percent of their rating.

```bash
# read power from a server BMC
ipmitool dcmi power reading
# many PDUs expose SNMP or Redfish; example SNMP read
snmpget -v2c -c public pdu-a-12 .1.3.6.1.4.1.318.1.1.12.1.16.0
```

## Redundant feeds

With **A and B** feeds, each server draws from both. If one feed fails, the other carries everything, so the **sum of both** must fit within one feed. That means total load must stay under roughly 40 percent of the combined rating, or under 80 percent of one feed. Balance servers across phases so no single phase overloads.

## Cooling

Servers pull cold air in at the front and exhaust hot air at the back. Keep cold and hot aisles separate, use blanking panels in empty slots and watch **inlet temperature** sensors on servers. High inlet temperature means recirculation or too much heat in one place. Dense GPU racks may need liquid cooling or fewer servers per rack.

## Capacity tracking

Record per rack: rated power, measured peak, space left, cooling limit and network ports. The smallest of these is the real capacity. Unused space with no spare power is **stranded**. Review monthly and before every order.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Power, cooling and rack capacity planning fits together
node: n1 | Power budget | 0 | 0 | Estimate from measured draw at typical and peak load, not from the label on the power supply. | Budgeting from nameplate instead of measured draw. | process
node: n2 | Redundant feeds | 1 | 1 | With A and B feeds, each server draws from both. | Letting A and B feeds both run near their limit. | process
node: n3 | Cooling | 2 | 0 | Servers pull cold air in at the front and exhaust hot air at the back. | Leaving gaps in racks without blanking panels. | process
node: n4 | Capacity tracking | 3 | 1 | Record per rack: rated power, measured peak, space left, cooling limit and network ports. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: One feed fails, the other trips

> **Incident:** Losing feed A overloaded feed B and a breaker opened.

```console
PDU-A: input lost
PDU-B: load 31.4A of 32A rated
PDU-B: breaker tripped, 24 servers down
```

The rack had been designed as redundant, but both feeds already ran near capacity. When A failed, B took the full load and tripped. After the outage the team set a rule that the combined load must fit on one feed with headroom, and added alerts at 70 percent per feed.

## Common mistakes

- Budgeting from nameplate instead of measured draw
- Letting A and B feeds both run near their limit
- Leaving gaps in racks without blanking panels
- Ignoring inlet temperature trends

```quiz
Q: What does N+1 power redundancy require?
+ Remaining feeds can carry the full load
- Both feeds run at 100 percent :: No.
- A single feed only :: No.
- No monitoring :: No.
> The surviving feed must cope.

Q: What does a high inlet temperature suggest?
+ Poor airflow or too much heat nearby
- A DNS fault :: No.
- A full disk :: No.
- A bad switch :: No.
> Check recirculation and density.

Q: Why use blanking panels?
+ They stop hot air flowing back to the front
- They add storage :: No.
- They protect passwords :: No.
- They speed up PXE :: No.
> Airflow control matters.

Q: What is stranded capacity?
+ Space or ports unusable because power or cooling is exhausted
- Extra network ports :: No.
- Spare disks :: No.
- Unused licences :: No.
> Another limit blocks use.
```

```cards
Inlet temperature :: Air temperature entering the server
PDU :: Power distribution unit in a rack
A and B feeds :: Two independent power paths
Stranded capacity :: Capacity that cannot be used because of another limit
```
