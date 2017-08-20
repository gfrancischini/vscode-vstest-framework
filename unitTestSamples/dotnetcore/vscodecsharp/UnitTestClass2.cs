using System.Threading;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace vscodecsharp
{
    [TestClass]
    public class UnitTestClass2
    {
        [TestMethod]
        public void TestMethodLongSuccessTest()
        {
            Thread.Sleep(3000);
            Assert.AreEqual(1, 1);
        }

        [TestMethod]
        public void TestMethodLongFailTest()
        {
            Thread.Sleep(2500);
            Assert.Fail();
        }
    }
}
