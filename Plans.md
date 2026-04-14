Understanding Problem
Understanding the Problem
Task: Preparing for a meeting with a Small sized team for a PoS system.
Collectable Books
Cover the whole system from taking the book in, processing it, to selling the book.
Scope: Unknown
Hooker’s General Principles
1. The Reason It All Exists – provide value to users.
2. KISS (Keep It Simple, Stupid!) – design simple as it can be.
3. Maintain the Vision – clear vision is essential.
4. What You Produce, Others Will Consume.
5. Be Open to the Future - do not design yourself into a corner.
6. Plan Ahead for Reuse – reduces cost and increases value.
7. Think! – placing thought before action produce results
Agenda:
• A list of the tasks to be accomplished.
• A list of the work products to be produced.
• A list of the quality assurance filters to be applied
• What resources we can get from the manager
Development Cycle: Agile
Priorities:
• Working software that meets customer needs is the primary goal
• Be able to change as requirements change
• Deliver software increments frequently
Use Case Definition:
Have we accurately identified our stakeholders?
Have we defined a clear hierarchy of responsibility?
What is the purpose of the system being built?
What system information will the stakeholder acquire, modify or produce?
What scenarios does the system have to account for?
How much time do we have?
What are the constraints to be considered in relation to the system?
Potentially Out of Scope?
Do we have the following roles?
Team:
System Tester:
System Design:
Facilitator:
Software Engineers:
Business Analyst:
Book shop never had computer system
Timescale 4 weeks from now to have software quality plan
1. Meet with manager
2. Elicit requirements
3. Who will meet/talk to customer
4. Communicate with user
User: Hates the till and making a mistake on it is very hard to fix
When shop is busy and quick make a mistake doesn’t realize until transaction is
completed, 10 branches in the region move with the times.
They sell 1
st editions collectable books, coffee shop as well (separate system)
Describe a regular interaction witht he till
Questions for User:
When have you found yourself wanting an extra feature in the PoS
What are the drawbacks to your current system?
What is the biggest issue that you face with your current system?
How do you want the data to be displayed:
Do you have any current hardware to replace the current till we can specify in.
Answers:
No computer, want instagram need phone
Has accounts manually written on paper has to wait for these to be done before she
can see sales, prefer computer so she can see them instantly and understand how
business is going
Separate page for travel books
Doesn't know how they scan books in, need to ask, they have three receipt scanners
Have a large safe that has to be brought up and down from the basement from time
to time, is a large hassle with dealing with cash#
Store front person had a big issue but me and Chris weren't listening so idk what it
was
Requirements
FR
FR-01 The system will allow staff to process sales transactions, including the ability
to correct mistakes before a transaction is finalised. Hardware available: scanning
workflow to be confirmed with staff.
FR-02 The system will scan books using barcode scanners
FR-03 The system should display live sales data and reports so management can
view business performance in real time, without waiting. Cash management is a
significant pain point for the manager.
FR-04 The system will support a dedicated category or page for travel books,
separate from general stock browsing.
FR-05 The system will support management of first-edition and collectable book
inventory as a distinct product category.
FR-06 The system will be accessible from a mobile phone, as the manager requires
Instagram-style access to business information.
FR-07 The system will support operation across up to 10 branch locations in the
region. Multi-branch sync/reporting scope to be confirmed.
FR-08 Details not captured is a huge issue. We need to capture all information from
the transaction itself.
FR-09 All transactions must be secure to prevent fraud.
FR-10 The system that we create has to have on hand all the hardware needed, as
well as keeping spare parts and PoSs in order to easily swap in and out while not
disrupting business.
NFR
NFR-01 The system will be fast and reliable during peak trading periods, allowing
staff to process transactions quickly without sales being disrupted.
NFR-02 The system interface will be intuitive enough that staff with no prior
computer system experience can use it with minimal training. The bookshop has
never had a computer system before.
NFR-03 The system will be accessible via mobile/tablet for management review of
sales and reports.
CON
CON-01 The coffee shop operates a separate system and is explicitly out of scope
for this PoS.
CON-02 The system must integrate with or replace the current cash-handling
workflow. The existing large safe (stored in the basement) is a known operational
burden.
CON-03 A software quality plan must be delivered within 4 weeks.
CON-04 Three barcode/receipt scanners are available on-site. The system must be
compatible with existing hardware or replacements must be acquired.
CON-05: Staff must be trained on the new system.
TBD
TBD-01 Instagram/social media integration. Clarify whether this means
mobile-responsive reporting or actual Instagram posting.
TBD-02 Multi-branch centralisation. Confirm whether a single shared system or
branch-level systems with syncing/reporting is needed for this system.
TBD-03 How books are currently scanned into inventory. The process needs to be
confirmed with staff before designing the system in the first place.
Sprint
4-Week Sprint Plan Bookshop PoS (2 days/week / 8 days in total)
Week 1: Figure out what we actually need (Days 1-2)
The whole point of this week is to close out the unknowns before we start designing
anything. The BA leads most of this.
● Go back to the storefront staff member and find out what their issue was. Drilling into
the problem with the 5 whys is hugely important.
● Nail down the multi-branch question. One central system or per-branch with sync?
SM and BA have to make a decision from the manager. Everything in Week 2
depends on this.
● Clarify what the manager actually means by "Instagram-style". Is it just a mobile
dashboard or does she want actual social media stuff? BA to confirm.
● Find out how books currently get scanned into inventory. We can't design the
workflow blind. BA has to go talk to staff.
● Sit down with the three on-site scanners and test compatibility with whatever PoS
solutions we're considering. SD and Dev own this. We have to see where we are at
before continuing.
Week 2: Design the system (Days 3-4)
Assuming the TBDs from Week 1 are resolved, we get into architecture and design. SD
leads, Dev and BA support.
● Design the core transaction flow. How a sale works, how mistakes get corrected
before finalising, how the barcode scanners feed into it. SD and Dev on this one.
● Design the inventory structure. Travel books as their own category, first editions and
collectables as their own thing.BA and SD working on this.
● Design the multi-branch architecture based on whatever was decided in Week 1. SD
and Dev.
● Design the transaction data capture system. We flagged that we're missing details
from transactions, so we need to define exactly what gets recorded for every sale.
BA and SD.
● Work out the security model for transactions, preventing fraud and accessing
controls. SD and Dev.
● Draft the Software Quality Plan. This has to be done by the end of Week 2,which is a
hard deadline. SM, BA and QA work on this together
Week 3: Build it (Days 5-6)
Dev should take the lead with QA starting testing as features land.
● Build the sales transaction flow with error correction and barcode scanner support.
Dev will build and QA will test as it comes in.
● Build the live sales dashboard so the manager can see real-time data without waiting
on manual accounts. Purely Dev work.
● Build out the inventory categories. Travel books, first editions, collectables should all
be written out. Dev and QA on this.
● Build the mobile access for the manager Dev on frontend with QA testing the pushes
and QA.
● Do a UX walkthrough with actual staff. Someone who has never used a computer
system before should be able to pick this up quickly. SM, BA and QA run this
together, linking in the key stakeholders
● Make sure transaction data capture is comprehensive. Every sale needs to be logged
properly. Dev and QA on this.
Week 4: Test, integrate, ship (Days 7-8)
Tying everything together and making sure it actually works in the real world.
● Ensure that the system works across all branches – Software Tester
● Stress test the system under busy conditions — it needs to hold up when the shop is
packed. – Software Tester
● Test the hardware spare parts – Software Tester
● Final check that the coffee shop system has zero crossover with ours. – System
Design
● Full team retrospective and stakeholder sign-off. Day 8. Everyone.
● User acceptance of the system and then adoption
UML
UML Use Case Diagram
UML Class Diagram
UML State Diagram
Software Methodology
 Unified Process Model
What UP is:
The Unified Process Model is a software development framework that structures a
project into four phases: inception, elaboration, construction, and transition, where
each phase is worked through iteratively rather than in one big pass. Unlike waterfall
where you plan everything upfront and hope for the best, UP front-loads the risky
and uncertain parts of the project so that by the time you're actually building the
system, you're working from a solid, tested architecture rather than discovering
fundamental problems halfway through development.
Why Over Other Frameworks:
1. Risks come out earlier than waterfall, so you can deal with them earlier than
waterfall.
2. Higher risk parts of the project are completed at the start so that errors can be
found as early as possible
3. Tries to avoid big errors that involve refactoring the whole system, by
ensuring a stable and correct initial architecture, which can be a common
issue in agile frameworks.
4. Great for medium-large scale projects
Example of a Unified Process Model in Action:
Inception: Define the problem, stakeholders, and high-level system scope.
Elaboration: Refine requirements and design the system architecture in detail.
Construction: Build and test the system features based on the design.
Transition: Deploy the system, test it in the real environment, and hand it over to
users.
Roles in the Unified Process Model:
The Unified Process involves multiple roles working collaboratively across all phases of
development:
Business Analyst (BA): Gathers and refines requirements, communicates with
stakeholders, and ensures the system meets business needs.
Software Designer (SD): Responsible for system architecture, design decisions, and
ensuring the project is feasible.
Software Developer (Dev): Implements the system by writing and building the required
features.
Quality Assurance / Tester (QA): Tests the system continuously to identify defects and
ensures that quality standards are met.
Project Manager (PM): Coordinates the team, manages timelines, and ensures the process
runs smoothly.
Stakeholders (e.g. bookshop staff and manager): Provides requirements, feedback, and
approves the system.
Scope of this Project:
Purpose Design and deliver a Point of Sale system for a collectible bookshop.The shop has
never had a computer system before, so this is a greenfield implementation replacing a fully
manual, paper-based operation.
What's in scope The system covers the full lifecycle of a book, from intake and inventory
management through to sale and reporting. This includes barcode-based scanning for stock
intake, a transaction engine that lets staff correct mistakes before finalising a sale,
categorised inventory (general, travel, first edition/collectable), real-time sales dashboards
accessible on mobile, comprehensive transaction logging, fraud prevention controls, and
hardware management including spare device availability across branches. A software
quality plan is a hard deliverable within the 4-week window.
What's out of scope The coffee shop operates its own separate system and has no
connection to this PoS. Social media posting is not confirmed in scope, the manager's
"Instagram" request likely means a mobile-friendly dashboard, which is in scope, but actual
Instagram integration is not.
Team and timeline A small team covering the roles of Business Analyst, System Designer,
Software Engineers, System Tester, and a facilitating PM, working across 8 days over 4
weeks. Week 1 closes open questions, Week 2 designs and delivers the quality plan, Week
3 builds core features, and Week 4 tests, integrates, and gets stakeholder sign-off.
Key constraints The software quality plan must be delivered within 4 weeks. The system
must work with the three on-site barcode scanners or suitable replacements. Staff have no
prior system experience, so usability is a first-class requirement. The cash management
burden (the basement safe) is a known pain point the system should help address, even if a
full replacement isn't in scope.