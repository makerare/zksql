from petlib.ec import EcGroup, Bn
import time
import random
import multiprocessing as mp
import math
import os
from os import path
import shutil
import binascii

# CURVENUMBER = 714 #SECG curve over a 256 bit primefield ("secp256k1")
# CURVENUMBER = 716 # NIST/SECG curve over a 521 bit prime field ("secp521r1")
CURVENUMBER = 415  # X9.62/SECG curve over a 256 bit prime field ("secp256r1")


def printProgressBar(
    iteration,
    total,
    prefix="",
    suffix="",
    decimals=1,
    length=100,
    fill="█",
    printEnd="\r",
):
    """
    Call in a loop to create terminal progress bar
    @params:
        iteration   - Required  : current iteration (Int)
        total       - Required  : total iterations (Int)
        prefix      - Optional  : prefix string (Str)
        suffix      - Optional  : suffix string (Str)
        decimals    - Optional  : positive number of decimals in percent complete (Int)
        length      - Optional  : character length of bar (Int)
        fill        - Optional  : bar fill character (Str)
        printEnd    - Optional  : end character (e.g. "\r", "\r\n") (Str)
    """
    percent = ("{0:." + str(decimals) + "f}").format(100 * (iteration / float(total)))
    filledLength = int(length * iteration // total)
    bar = fill * filledLength + "-" * (length - filledLength)
    print("\r%s |%s| %s%% %s" % (prefix, bar, percent, suffix), end=printEnd)
    # Print New Line on Complete
    if iteration == total:
        print()


class PublicParams:
    """
    Represents system's public parameters
    ...
    Attributes
    ----------
    group : EcGroup
        Elliptic curve as defined in petlib library
    g : EcPt
        Generator g
    """

    group = EcGroup(CURVENUMBER)

    def __init__(self, g=group.generator()):
        """
        Parameters
        ----------
        g : EcPt
            Generator g
        """
        self.g = g


PP = PublicParams()


def checkDups(listOfElems):
    """Checks if a list contains any duplicates
    Parameters
    ----------
    listOfElems : list
        List to be checked
    Returns
    -------
    bool
        If there are any duplicates
    """
    setOfElems = set()
    for elem in listOfElems:
        if elem in setOfElems:
            return True
        else:
            setOfElems.add(elem)
    return False


def checkDupsFile(filename):
    """Checks if a file contains any duplicates
    Parameters
    ----------
    filehandle : string
        File to be checked
    Returns
    -------
    bool
        If there are any duplicates
    """
    readList = []
    start = time.time()
    with open(str(filename), "r") as filehandle:
        filecontents = filehandle.readlines()
        for line in filecontents:
            current_place = line[:-1]
            readList.append(current_place)
    setOfElems = set()
    for elem in readList:
        if elem in setOfElems:
            print("Total time: " + str(round((time.time() - start), 3)) + str(" sec"))
            return True
        else:
            setOfElems.add(elem)
    print("Total time: " + str(round((time.time() - start), 3)) + str(" sec"))
    return False


def lookup2File(rng):
    """Generates a lookup table with range 2^rng, saves it to .txt file
    Parameters
    ----------
    rng : int
        Range of table
    Returns
    -------
    None
    """
    with open(str(CURVENUMBER) + "-" + str(rng) + "bits.txt", "w") as filehandle:
        temp = PP.g
        for i in range(1, 2**rng):
            filehandle.write("%s\n" % str(temp))
            temp = temp + PP.g
            printProgressBar(
                i + 1, 2**rng, prefix="Progress:", suffix="Complete", length=50
            )
    return None


def readLookFromFile(rng):
    """Loads lookup table from file
    Parameters
    ----------
    rng : int
        Range of table
    Returns
    -------
    None
    """
    readList = []
    with open(str(CURVENUMBER) + "-" + str(rng) + "bits.txt", "r") as filehandle:
        filecontents = filehandle.readlines()
        for line in filecontents:
            current_place = line[:-1]
            readList.append(current_place)
    return readList


def readLookFromFileB(filename):
    readList = []
    with open(filename, "r") as filehandle:
        filecontents = filehandle.readlines()
        for line in filecontents:
            current_place = line[:-1]
            readList.append(current_place)
    return readList


def lookup2FileRes(rng):
    """Generates a lookup table with range 2^rng, resuming if previous exists.
       Saves it to .txt file
    Parameters
    ----------
    rng : int
        Range of table
    Returns
    -------
    None
    """
    startIdx = 1
    r = rng
    resume = False
    while r > 7 and not resume:
        r -= 1
        resume = path.exists(str(CURVENUMBER) + "-" + str(r) + "bits.txt")
    if resume:
        shutil.copy(
            (str(CURVENUMBER) + "-" + str(r) + "bits.txt"),
            (str(CURVENUMBER) + "-" + str(rng) + "bits.txt"),
        )
        startIdx = 2**r
    with open(str(CURVENUMBER) + "-" + str(rng) + "bits.txt", "a") as filehandle:
        temp = startIdx * PP.g
        for i in range(startIdx, 2**rng):
            filehandle.write("%s\n" % str(temp))
            temp = temp + PP.g
            printProgressBar(
                i + 1, 2**rng, prefix="Progress:", suffix="Complete", length=50
            )
    return None


def lookup2FileB(torng, fromrng=0):
    """Generates a lookup table from range 2^fromrng to 2^torng.
       Saves it to .txt file
    Parameters
    ----------
    fromrng, torng : int
        Range of table
    Returns
    -------
    None
    """
    startIdx = 2**fromrng
    with open(
        str(CURVENUMBER) + "-" + str(fromrng) + "to" + str(torng) + "bits.txt", "a"
    ) as filehandle:
        temp = startIdx * PP.g
        for i in range(startIdx, 2**torng):
            filehandle.write("%s\n" % str(temp))
            temp = temp + PP.g
            printProgressBar(
                i + 1, 2**torng, prefix="Progress:", suffix="Complete", length=50
            )
    return None


def lookup2FileC(torng, fromrng=1):
    """Generates a lookup table from range fromrng to torng.
       Saves it to .txt file
    Parameters
    ----------
    fromrng, torng : int
        Range of table
    Returns
    -------
    None
    """
    with open(
        str(CURVENUMBER) + "-" + str(fromrng) + "to" + str(torng) + ".txt", "a"
    ) as filehandle:
        temp = fromrng * PP.g
        for i in range(fromrng, torng):
            filehandle.write("%s\n" % str(temp))
            temp = temp + PP.g
            printProgressBar(
                i + 1, torng, prefix="Progress:", suffix="Complete", length=50
            )
    return None


def concatFiles(fromrng, midrng, torng):
    fileA = str(CURVENUMBER) + "-" + str(fromrng) + "to" + str(midrng) + "bits.txt"
    fileB = str(CURVENUMBER) + "-" + str(midrng) + "to" + str(torng) + "bits.txt"
    fileC = str(CURVENUMBER) + "-" + str(fromrng) + "to" + str(torng) + "bits.txt"
    with open(fileC, "w") as outfile:
        for fname in [fileA, fileB]:
            with open(fname) as infile:
                for line in infile:
                    outfile.write(line)


def concatFilesC(fromrng, midrng, torng):
    fileA = str(CURVENUMBER) + "-" + str(fromrng) + "to" + str(midrng) + ".txt"
    fileB = str(CURVENUMBER) + "-" + str(midrng) + "to" + str(torng) + ".txt"
    fileC = str(CURVENUMBER) + "-" + str(fromrng) + "to" + str(torng) + ".txt"
    with open(fileC, "w") as outfile:
        for fname in [fileA, fileB]:
            with open(fname) as infile:
                for line in infile:
                    outfile.write(line)


def truncate(lookupRaw):
    """Truncates lookuptable iteratively (Solution A)
    Parameters
    ----------
    lookupRaw : list
        List to be truncated
    Returns
    -------
    testList
        Truncated table
    """
    for i in range(1, len(lookupRaw[0])):
        testList = []
        for elem in lookupRaw:
            testList.append(elem[-i:])
        if not checkDups(testList):
            return testList


def truncNomem(inputfile, truncvalue):
    with open(inputfile + str(".trunc"), "w") as outfile:
        with open(inputfile) as infile:
            for line in infile:
                outfile.write(line[-truncvalue - 1 :])


def truncNomemleft(inputfile, truncvalue):
    with open(inputfile + str(".truncl"), "w") as outfile:
        with open(inputfile) as infile:
            for line in infile:
                outfile.write(line[2 : 2 + truncvalue] + "\n")


def truncHeur(lookupRaw, target, quit=None, foundit=None):
    """Truncates lookuptable with random heuristic (Solution C). Can be parallelized.
    Parameters
    ----------
    lookupRaw : list
        List to be truncated
    target : int
        Sets the difficulty of the search. Typically is 1. If set to 2 might take very long.
    quit : multiprocessing.event
        Stops loop when found solution
    foundit : multiprocessing.event
        Quits all spawned processes when found solution
    Returns
    -------
    None
    """
    # for j in range(0,tries):
    if quit == None:
        quit = mp.Event()
        foundit = mp.Event()
    i = 0
    start = time.time()
    while not quit.is_set():
        # make tries random attempts
        # pick i-1 random hex indices
        i += 1
        selInd = random.sample(range(2, 66), target)
        selInd.sort(reverse=True)
        testList = []
        for elem in lookupRaw:
            # choose those random indices and test if all unique
            truncElem = ""
            for k in selInd:
                truncElem = truncElem + elem[k]
            testList.append(truncElem)
        if not checkDups(testList):
            print("Found combination: " + str(selInd))
            print("Tries/sec:" + str(i / (time.time() - start)))
            foundit.set()
            break


def truncTest(rng, diff=1):
    """First truncates using Solution A, then truncates using Solution C.
    Parameters
    ----------
    rng : int
        Range size to be read from file
    diff : int
        Sets the difficulty of the search. Typically is 1. If set to 2 might take very long.
    Returns
    -------
    None
    """
    f = readLookFromFile(rng)  # Read from file
    a1 = truncate(f)  # truncate first using SolnA
    print("Naive truncate:" + str(len(a1[0])))
    truncHeur(f, len(a1[0]) - diff)  # Truncate using SolnC


def truncTestMult(rng, diff=1, cores=mp.cpu_count()):
    """First truncates using Solution A, then truncates using Solution C using multiple cores.
    Parameters
    ----------
    rng : int
        Range size to be read from file
    diff : int
        Sets the difficulty of the search. Typically is 1. If set to 2 might take very long.
    cores : int
        Number of cores to be used
    Returns
    -------
    None
    """
    f = readLookFromFile(rng)
    a1 = truncate(f)
    print("Naive truncate:" + str(len(a1[0])))
    quit = mp.Event()
    foundit = mp.Event()
    for i in range(cores):
        p = mp.Process(target=truncHeur, args=(f, len(a1[0]) - diff, quit, foundit))
        p.start()
    foundit.wait()
    quit.set()


def lookup2FileResMult(fromrng, torng, cores=mp.cpu_count()):
    for i in range(cores):
        if i == 0:
            p = mp.Process(
                target=lookup2FileC,
                args=(int((i + 1) * torng / cores), int(i * torng / cores) + 1),
            )
            p.start()
        else:
            p = mp.Process(
                target=lookup2FileC,
                args=(int((i + 1) * torng / cores), int(i * torng / cores)),
            )
            p.start()


def truncateR(table, hexes):
    """Truncates table from MSB side.
    Parameters
    ----------
    table : list
        List to be truncated
    hexes : int
        Number of hex positions for final result.
    Returns
    -------
    truncList
        Truncated lookup table
    """
    for i in range(1, len(table[0])):
        truncList = []
        for elem in table:
            truncList.append(elem[:hexes])
    return truncList


def returnDups(listOfElems):
    """Extracts duplicates from list.
    Parameters
    ----------
    listOfElems : list
        List to be parsed
    Returns
    -------
    [uniqueList,dupeindices]
        uniqueList : has only unique elements, None elsewhere
        dupeindices : set of duplicate indices in initial list
    """
    setOfElems = set()
    dupeindices = set()
    uniqueList = []
    for i, elem in enumerate(listOfElems):
        # for elem in listOfElems:
        if elem in setOfElems:
            uniqueList.append(None)
            dupeindices.add(i)
        else:
            setOfElems.add(elem)
            uniqueList.append(elem)
    return [uniqueList, dupeindices]


def countSizes(lst):
    """Counts number of occurences for each size.
    Parameters
    ----------
    lst : list
        List to be counted
    Returns
    -------
    counddict
        Dictionary (JSON) with counts
    """
    countdict = {}
    for elm in lst:
        if len(elm) in countdict:
            countdict[len(elm)] += 1
        else:
            countdict.update({len(elm): 1})
    return countdict


def truncVar(rng):
    """Truncates using Solution E with variable length.
    Parameters
    ----------
    rng : int
        Range size to be read from file
    Returns
    -------
    outList
        Truncated List
    """
    f = readLookFromFile(rng)
    a1 = truncate(f)
    print("Naive truncate: " + str(len(a1[0])) + " hexes")
    reprhexes = (
        math.ceil(math.log(len(a1) + 1, 16)) - 1
    )  # minimum (ideal) hexes needed to represent
    print("Ideal truncate: " + str(reprhexes) + " hexes")
    outList = []  # unique elements will go here
    for idx in range(2**rng - 1):
        outList.append(None)
    while checkNoneList(outList):  # check if everything has moved in outList
        dupedict = {}  # map of occurences
        tempList = truncateR(a1, reprhexes)  # first truncate to minimum hexes
        for elem in tempList:  # count occurences in tempList
            if elem in dupedict and elem != None:
                dupedict[elem] += 1
            elif elem != None:
                dupedict.update({elem: 1})
        for idx, elem in enumerate(
            tempList
        ):  # move unique elements from tempList to outList
            if outList[idx] == None and dupedict[elem] == 1:
                outList[idx] = elem
        reprhexes += 1  # add another hex representation
    return outList


def lookup(lookupTable, gx):
    return lookupTable.index(gx)


def babygiantstep(lookupTable, gx, giantstepsize):
    i = 1
    gstp = giantstepsize * PP.g
    while i <= giantstepsize:
        try:
            res = (i - 1) * giantstepsize + lookupTable.index(str(gx)) + 1
            print(res)
            break
        except ValueError:
            gx = gx - gstp
            i += 1
    if i == giantstepsize + 1:
        print("Not found")


def checkNoneList(lst):
    """Check if list has any None types.
    Parameters
    ----------
    lst : lst
        List to be checked
    Returns
    -------
    bool
    """
    for elem in lst:
        if elem == None:
            return True
    return False


def checkDupsFileC(filename):
    setOfElems = set()
    i = 0
    start = time.time()
    with open(str(filename), "r") as filehandle:
        for line in filehandle:
            # elem = bytes.fromhex(line[:-1])
            elem = line[:-1]
            if elem in setOfElems:
                print(
                    "Total time: " + str(round((time.time() - start), 3)) + str(" sec")
                )
                return True
            else:
                setOfElems.add(elem)
            i += 1
            if i % 10000 == 0:
                print(i, end="\r", flush=True)
    print("Total time: " + str(round((time.time() - start), 3)) + str(" sec"))
    return False


def checkDupsFileparts(numfiles, resi=1, resj=2):
    start = time.time()
    k = 0
    for i in range(resi, numfiles + 1):
        if i == resi:
            startj = resj
        else:
            startj = i + 1
        for j in range(startj, numfiles + 1):
            k = 0
            setOfElems = set()
            with open("part" + str(i), "r") as filehandle:
                for line in filehandle:
                    k += 1
                    if k % 100000 == 0:
                        print(
                            str(i) + "-" + str(j) + "-" + str(k), end="\r", flush=True
                        )
                    elem = line[:-1]
                    if elem in setOfElems:
                        f = open("dupsresults.txt", "a")
                        f.write(str(elem) + "\n")
                        f.write(str(i) + "-" + str(j) + "\n")
                        f.write(str(k) + "\n")
                        f.close()
                    else:
                        setOfElems.add(elem)
            with open("part" + str(j), "r") as filehandle:
                for line in filehandle:
                    k += 1
                    if k % 100000 == 0:
                        print(
                            str(i) + "-" + str(j) + "-" + str(k), end="\r", flush=True
                        )
                    elem = line[:-1]
                    if elem in setOfElems:
                        f = open("dupsresults.txt", "a")
                        f.write(str(elem) + "\n")
                        f.write(str(i) + "-" + str(j) + "\n")
                        f.write(str(k) + "\n")
                        f.close()
                    else:
                        setOfElems.add(elem)
            f = open("dupsresults.txt", "a")
            f.write("Completed: " + str(i) + "-" + str(j) + "\n")
            f.close()
    print("Total time: " + str(round((time.time() - start), 3)) + str(" sec"))


def cremptyfile(filename, linenums, linelen):
    with open(filename, "w") as outfile:
        for i in range(1, linenums):
            outfile.write(" " * linelen + "\n")


def checkvarDupsFileparts(numfiles, linenums, trdpth, resi=1, resj=2):
    start = time.time()
    k = 0
    with open("part1", "r") as testfile:
        line1 = testfile.readline()
        linelgth = len(line1)
        testfile.close()
    for i in range(resi, numfiles + 1):
        if i == resi:
            startj = resj
        else:
            startj = i + 1
        for j in range(startj, numfiles + 1):
            k = 0
            setOfElems = set()
            outfilename = "part" + str(i) + ".dups"
            if not os.path.exists(outfilename):
                cremptyfile(outfilename, linenums, linelgth)
            with open("part" + str(i), "r") as fileA, open(outfilename, "r+") as fileB:
                line_start = fileB.tell()
                line1 = fileA.readline()[trdpth:]
                line2 = fileB.readline()
                while line1 and line2:
                    k += 1
                    if k % 100000 == 0:
                        print(
                            str(i) + "-" + str(j) + "-" + str(k), end="\r", flush=True
                        )
                    elem = line1[:-1]
                    offset = 1
                    if line2[-1:] != "\n":
                        offset = 0
                    replace = (len(line1) - offset) * "x"
                    if elem in setOfElems:
                        # if elem is duplicate
                        # put xxx's to dupsfile
                        fileB.seek(line_start)
                        fileB.write(replace)
                    else:
                        # elem is not duplicate
                        setOfElems.add(elem)
                        if line2[:-1] != (len(line1) - offset) * "x":
                            fileB.seek(line_start)
                            fileB.write(replace)
                    line_start = fileB.tell()
                    if line1 != line2:
                        line1 = fileA.readline()
                    line2 = fileB.readline()
            outfilename = "part" + str(j) + ".dups"
            if not os.path.exists(outfilename):
                cremptyfile(outfilename, linenums, linelgth)
            with open("part" + str(j), "r") as fileA, open(
                "part" + str(j) + ".dups", "r+"
            ) as fileB:
                line_start = fileB.tell()
                line1 = fileA.readline()[trdpth:]
                line2 = fileB.readline()
                while line1 and line2:
                    k += 1
                    if k % 100000 == 0:
                        print(
                            str(i) + "-" + str(j) + "-" + str(k), end="\r", flush=True
                        )
                    elem = line1[:-1]
                    offset = 1
                    if line2[-1:] != "\n":
                        offset = 0
                    replace = (len(line1) - offset) * "x"
                    if elem in setOfElems:
                        # if elem is duplicate
                        # put xxx's to dupsfile
                        fileB.seek(line_start)
                        fileB.write(replace)
                    else:
                        # elem is not duplicate
                        setOfElems.add(elem)
                        if line2[:-1] != (len(line1) - offset) * "x":
                            fileB.seek(line_start)
                            fileB.write(replace)
                    line_start = fileB.tell()
                    if line1 != line2:
                        line1 = fileA.readline()
                    line2 = fileB.readline()
            f = open("dupsresultstr.txt", "a")
            f.write("Completed Tr: " + str(i) + "-" + str(j) + "\n")
            f.close()
    print("Total time: " + str(round((time.time() - start), 3)) + str(" sec"))


def renameFileparts():
    k = 0
    for filename in os.listdir():
        if filename.startswith("x"):
            k += 1
            org_fp = os.path.join(filename)
            new_fp = os.path.join("part" + (str(k)))
            os.rename(org_fp, new_fp)


def checkDupsandsplit(filename):
    setOfElems = set()
    flag = False
    filesplit = str(filename) + "-split.txt"
    with open(str(filename), "r") as filehandle:
        with open(filesplit, "w") as outfile:
            for line in filehandle:
                elem = line[:-1]
                if elem in setOfElems:
                    flag = True
                elif not flag:
                    setOfElems.add(elem)
                if flag:
                    outfile.write(line)


def lookupinfile(filename, elem):
    with open(str(filename), "r") as filehandle:
        for linenum, line in enumerate(filehandle):
            if elem == line[:-1]:
                print("Element " + str(elem) + " found at line " + str(linenum + 1))


def lookupvalue(filename, val):
    with open(str(filename), "r") as filehandle:
        for linenum, line in enumerate(filehandle):
            if linenum + 1 == val:
                return line[:-1]
            # if elem == line[:-1]:
            #    print("Element "+str(elem)+" found at line " + str(linenum+1))


def insert2line(inputfile, lineinsert, instring):
    with open(inputfile + str(".insert"), "w") as outfile:
        with open(inputfile, "r") as infile:
            for linenum, line in enumerate(infile):
                if linenum == lineinsert:
                    outfile.write(instring + "\n")
                outfile.write(line)


def countlines(filename):
    with open(str(filename), "r") as filehandle:
        totallines = 0
        for line in filehandle:
            totallines += 1
    return totallines


def lookup2FileResB(rng):
    """Generates a lookup table with range 2^rng, resuming if previous exists.
       Saves it to .txt file
    Parameters
    ----------
    rng : int
        Range of table
    Returns
    -------
    None
    """
    outfilename = str(CURVENUMBER) + "-1to" + str(rng) + ".txt"
    resume = path.exists(outfilename)
    if resume:
        startIdx = countlines(outfilename) + 1
    else:
        startIdx = 1
    with open(outfilename, "a") as filehandle:
        temp = startIdx * PP.g
        for i in range(startIdx, rng):
            filehandle.write("%s\n" % str(temp))
            temp = temp + PP.g
            printProgressBar(
                i + 1, rng, prefix="Progress:", suffix="Complete", length=50
            )


def lookupelemtruncl(filename, elem, truncvalue):
    with open(str(filename), "r") as filehandle:
        for linenum, line in enumerate(filehandle):
            if elem[2 : 2 + truncvalue] == line[:-1]:
                return linenum + 1


def babygiantsteptrunc(filename, gx, truncvalue, giantstepsize):
    i = 1
    gstp = 2**giantstepsize * PP.g
    res = None
    start = time.time()
    while i <= 2**giantstepsize and res == None:
        print(str(i) + "/" + str(2**giantstepsize), end="\r", flush=True)
        res = lookupelemtruncl(filename, str(gx), truncvalue)
        gx = gx - gstp
        i += 1
    if res == None:
        print("Total time: " + str(round((time.time() - start), 3)) + str(" sec"))
        return None
    else:
        print("Total time: " + str(round((time.time() - start), 3)) + str(" sec"))
        return res + (i - 2) * (2**giantstepsize)


def lookupelemtrunclfileparts(elem, truncvalue):
    result = None
    for i in range(1, 17):
        print(i)
        if result == None:
            result = lookupelemtruncl("part" + str(i), elem, truncvalue)
            if result != None:
                return result + ((i - 1) * 2**28)


def hextobin(infile, outfile):
    """
    Convert truncated hex text file to binary
    """
    with open(str(infile), "r") as filehandle:
        filename = open(outfile, "ab")
        for line in filehandle:
            filename.write(binascii.unhexlify(line[:-1]))
        filename.close()


def lookupnumtrunclbin(filename, num, truncvalue):
    """Returns binary value at position num"""
    with open(str(filename), "rb") as filehandle:
        filehandle.seek((num - 1) * (truncvalue + 1))
        return filehandle.read(truncvalue)


def lookupelemtrunclbin(filename, elem, truncvalue):
    """Returns position of elem in binary file"""
    with open(str(filename), "rb") as filehandle:
        counter = 0
        while True:
            counter += 1
            bytegroup = filehandle.read(int(truncvalue / 2))
            if elem[2 : 2 + truncvalue] == bytegroup.hex():
                return counter
            elif bytegroup == b"":
                return None


def trunclbin2dict(filename, truncvalue):
    """Loads binary table to a hashmap"""
    with open(str(filename), "rb") as filehandle:
        counter = 0
        hashmap = {}
        while True:
            counter += 1
            bytegroup = filehandle.read(int(truncvalue / 2))
            if bytegroup == b"":
                break
            hashmap[bytegroup] = counter
            # if elem[2:2+truncvalue] == bytegroup.hex():
            #    return counter
    return hashmap


def lookupelemtrunclfilepartsbin(elem, truncvalue, bin):
    result = None
    for i in range(1, 17):
        print(i)
        if result == None:
            if bin:
                result = lookupelemtrunclbin("part" + str(i) + ".bin", elem, truncvalue)
            else:
                result = lookupelemtruncl("part" + str(i), elem, truncvalue)
            if result != None:
                return result + ((i - 1) * 2**28)


def babygiantsteptruncparts(gx, truncvalue, giantstepsize, bin):
    """Bn.from_decimal(str(2**32))*PP.g"""
    i = 1
    gstp = Bn.from_decimal(str(2**giantstepsize)) * PP.g
    res = None
    start = time.time()
    while i <= 2**giantstepsize and res == None:
        print("Starting iteration " + str(i))
        res = lookupelemtrunclfilepartsbin(str(gx), truncvalue, bin)
        gx = gx - gstp
        i += 1
    if res == None:
        print("Total time: " + str(round((time.time() - start), 3)) + str(" sec"))
        return None
    else:
        print("Total time: " + str(round((time.time() - start), 3)) + str(" sec"))
        return res + (i - 2) * (2**giantstepsize)


# hmap = trunclbin2dict("part1.bin",16)
def babygiantsteptruncmap(gx, truncvalue, giantstepsize, hmap):
    i = 1
    gstp = 2**28 * PP.g
    res = None
    start = time.time()
    while i <= 2**giantstepsize and res == None:
        print("Starting iteration " + str(i))
        res = hmap.get(binascii.unhexlify(str(gx)[2 : 2 + truncvalue]))
        gx = gx - gstp
        i += 1
    if res == None:
        print("Total time: " + str(round((time.time() - start), 3)) + str(" sec"))
        return None
    else:
        print("Total time: " + str(round((time.time() - start), 3)) + str(" sec"))
        return res + (i - 2) * 2**28


def main():
    lookup2FileResB(32)


if __name__ == "__main__":
    main()
